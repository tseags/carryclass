import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncCalendarClasses } from "@/lib/onboarding-db";
import ICAL from "ical.js";
import { Resend } from "resend";
import { getStripe } from "@/lib/stripe";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

interface CalendarEvent {
  external_event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
}

interface VendorRow {
  id: string;
  name: string | null;
  email: string | null;
  calendar_type: string | null;
  ical_feed_url: string | null;
  google_calendar_id: string | null;
  google_refresh_token: string | null;
}

export async function GET(req: NextRequest) {
  // Vercel cron authenticates with CRON_SECRET header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: vendors } = await db
    .from("vendors")
    .select("id, name, email, calendar_type, ical_feed_url, google_calendar_id, google_refresh_token")
    .in("calendar_type", ["google", "ical"]);

  if (!vendors?.length) {
    return NextResponse.json({ synced: 0 });
  }

  const results: Array<{
    vendorId: string;
    status: string;
    inserted?: number;
    updated?: number;
    deactivated?: number;
    error?: string;
  }> = [];

  for (const vendor of vendors as VendorRow[]) {
    try {
      let events: CalendarEvent[] = [];

      if (vendor.calendar_type === "ical" && vendor.ical_feed_url) {
        events = await fetchIcalEvents(vendor.ical_feed_url);
      } else if (
        vendor.calendar_type === "google" &&
        vendor.google_calendar_id &&
        vendor.google_refresh_token
      ) {
        events = await fetchGoogleEvents(
          vendor.google_refresh_token,
          vendor.google_calendar_id
        );
      }

      const { inserted, updated, deactivated } = await syncCalendarClasses(
        vendor.id,
        events
      );

      // Handle cancellations: refund + notify
      if (deactivated > 0) {
        await handleCancelledClasses(vendor);
      }

      results.push({ vendorId: vendor.id, status: "ok", inserted, updated, deactivated });
    } catch (err) {
      results.push({
        vendorId: vendor.id,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ synced: vendors.length, results });
}

async function fetchIcalEvents(url: string): Promise<CalendarEvent[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "CarryClass/1.0 Calendar Sync" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`iCal fetch failed: HTTP ${res.status}`);
  const text = await res.text();

  const jcalData = ICAL.parse(text);
  const comp = new ICAL.Component(jcalData);
  const vevents = comp.getAllSubcomponents("vevent");

  const now = new Date();
  const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const events: CalendarEvent[] = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const uid = vevent.getFirstPropertyValue("uid") as string | null;
    const dtstart = event.startDate;
    const dtend = event.endDate;
    if (!dtstart || !dtend) continue;
    const startDate = dtstart.toJSDate();
    if (startDate < now || startDate > cutoff) continue;
    const rrule = vevent.getFirstPropertyValue("rrule");
    events.push({
      external_event_id: uid ?? `ical_${startDate.getTime()}`,
      title: event.summary ?? "Class",
      start_time: dtstart.toJSDate().toISOString(),
      end_time: dtend.toJSDate().toISOString(),
      is_recurring: Boolean(rrule),
      recurrence_rule: rrule ? String(rrule) : null,
    });
  }
  return events;
}

async function fetchGoogleEvents(
  refreshToken: string,
  calendarId: string
): Promise<CalendarEvent[]> {
  // Exchange refresh token for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!tokenRes.ok) throw new Error("Failed to refresh Google token");
  const { access_token: accessToken } = await tokenRes.json();

  const now = new Date();
  const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: cutoff.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const eventsRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!eventsRes.ok) throw new Error("Failed to fetch Google Calendar events");

  const data = await eventsRes.json();
  return (data.items ?? []).map(
    (item: { id: string; summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string }; recurrence?: string[] }) => ({
      external_event_id: item.id,
      title: item.summary ?? "Class",
      start_time: item.start.dateTime ?? `${item.start.date}T00:00:00Z`,
      end_time: item.end.dateTime ?? `${item.end.date}T00:00:00Z`,
      is_recurring: Boolean(item.recurrence?.length),
      recurrence_rule: item.recurrence?.[0] ?? null,
    })
  );
}

async function handleCancelledClasses(vendor: VendorRow) {
  const db = supabaseAdmin();

  // Find bookings for deactivated classes
  const { data: cancelledClasses } = await db
    .from("vendor_calendar_classes")
    .select("id, title, start_time")
    .eq("vendor_id", vendor.id)
    .eq("is_active", false);

  if (!cancelledClasses?.length) return;

  for (const cls of cancelledClasses as { id: string; title: string; start_time: string }[]) {
    // Check Prisma Booking table for confirmed bookings linked to this class
    // Since the booking system uses Prisma, we query via raw SQL
    const { data: bookings } = await db
      .from("Booking")
      .select("id, studentEmail, stripePaymentIntentId, classSessionId")
      .eq("classSessionId", cls.id)
      .eq("status", "PAID");

    if (!bookings?.length) continue;

    for (const booking of bookings as { id: string; studentEmail: string; stripePaymentIntentId: string }[]) {
      try {
        // Issue full Stripe refund
        if (booking.stripePaymentIntentId) {
          await getStripe().refunds.create({
            payment_intent: booking.stripePaymentIntentId,
          });
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://getcarryclass.com";
        const rebookingLink = `${baseUrl}/instructors/${vendor.id}`;

        // Email student
        await getResend().emails.send({
          from: "bookings@getcarryclass.com",
          to: booking.studentEmail,
          subject: `Your class has been cancelled — rebook with ${vendor.name ?? "your instructor"}`,
          html: `
            <p>Hi,</p>
            <p>We're sorry to let you know that your upcoming class on 
            <strong>${new Date(cls.start_time).toLocaleDateString()}</strong> 
            has been cancelled due to a schedule change.</p>
            <p>Your payment has been fully refunded and should appear within 5–10 business days.</p>
            <p><a href="${rebookingLink}">Click here to rebook with ${vendor.name ?? "this instructor"}</a></p>
            <p>— The CarryClass Team</p>
          `,
        });

        // Email instructor
        if (vendor.email) {
          await getResend().emails.send({
            from: "bookings@getcarryclass.com",
            to: vendor.email,
            subject: "CarryClass automatically cancelled and refunded a booking",
            html: `
              <p>Hi ${vendor.name ?? "there"},</p>
              <p>Because your calendar event "<strong>${cls.title}</strong>" 
              on ${new Date(cls.start_time).toLocaleDateString()} was removed or rescheduled, 
              CarryClass automatically cancelled the associated booking and issued a full refund to the student.</p>
              <p>The student has been notified and given a link to rebook with you.</p>
              <p>— The CarryClass Team</p>
            `,
          });
        }
      } catch (err) {
        console.error(`Failed to process cancellation for booking ${booking.id}:`, err);
      }
    }
  }
}
