"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { VendorClassType } from "@/lib/onboarding-db";

type CalendarOption = "google" | "ical" | "manual";

interface FetchedEvent {
  external_event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  class_type: string;
  price: string;
  include: boolean;
  all_day?: boolean;
}

interface GoogleCalendarOption {
  id: string;
  name: string;
  primary: boolean;
}

type DaysWindow = 30 | 60 | 90 | 180;

const DAYS_WINDOW_OPTIONS: { value: DaysWindow; label: string }[] = [
  { value: 30, label: "Next 30 days" },
  { value: 60, label: "Next 60 days" },
  { value: 90, label: "Next 90 days" },
  { value: 180, label: "Next 180 days" },
];


type Recurrence = "one-time" | "weekly" | "biweekly" | "monthly";

interface ManualSlot {
  id: string;
  title: string;
  date: string;
  startTime: string;
  duration: number;
  classType: string;
  maxStudents: string;
  price: string;
  recurrence: Recurrence;
  endDate: string;
}

const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: "one-time", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const WEEKDAY_RRULE = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** Build an iCal RRULE string from a recurrence choice + start date. */
function buildRecurrenceRule(
  recurrence: Recurrence,
  startDate: string,
  endDate: string
): string | null {
  if (recurrence === "one-time" || !startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const parts: string[] = [];
  if (recurrence === "weekly") {
    parts.push("FREQ=WEEKLY", `BYDAY=${WEEKDAY_RRULE[start.getDay()]}`);
  } else if (recurrence === "biweekly") {
    parts.push("FREQ=WEEKLY", "INTERVAL=2", `BYDAY=${WEEKDAY_RRULE[start.getDay()]}`);
  } else if (recurrence === "monthly") {
    parts.push("FREQ=MONTHLY", `BYMONTHDAY=${start.getDate()}`);
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`);
    if (!Number.isNaN(end.getTime())) {
      parts.push(
        `UNTIL=${end.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`
      );
    }
  }
  return parts.join(";");
}

/** Human-readable summary like "Every Monday at 9:00 AM". */
function describeRecurrence(slot: ManualSlot): string {
  const time = slot.startTime
    ? new Date(`2000-01-01T${slot.startTime}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  const start = slot.date ? new Date(`${slot.date}T00:00:00`) : null;
  const weekday = start ? WEEKDAY_NAMES[start.getDay()] : "";
  switch (slot.recurrence) {
    case "weekly":
      return `Every ${weekday}${time ? ` at ${time}` : ""}`;
    case "biweekly":
      return `Every other ${weekday}${time ? ` at ${time}` : ""}`;
    case "monthly":
      return `Monthly on day ${start ? start.getDate() : ""}${time ? ` at ${time}` : ""}`;
    default:
      return `${slot.date}${time ? ` at ${time}` : ""}`;
  }
}

interface Props {
  classTypes: VendorClassType[];
  googleConnected: boolean;
  googleCalendarId?: string | null;
  icalUrl?: string | null;
  calendarType?: string | null;
}

const CLASS_TYPE_LABELS: Record<string, string> = {
  initial: "CCW Initial",
  renewal: "CCW Renewal",
  add_a_gun: "Add-A-Gun",
};

/** Parse "HH:MM" (24h) into 12-hour parts for the time selects. */
function parseTimeParts(value: string): {
  hour12: number;
  minute: number;
  period: "AM" | "PM";
} {
  if (!value) return { hour12: 9, minute: 0, period: "AM" };
  const [hStr, mStr = "0"] = value.split(":");
  const h24 = Number(hStr);
  const minute = Number(mStr.slice(0, 2));
  if (Number.isNaN(h24) || Number.isNaN(minute)) {
    return { hour12: 9, minute: 0, period: "AM" };
  }
  const period: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const snapped = Math.min(55, Math.round(minute / 5) * 5);
  return { hour12, minute: snapped, period };
}

/** Build "HH:MM" (24h) from 12-hour select parts. */
function toTimeValue(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h24 = hour12 % 12;
  if (period === "PM") h24 += 12;
  return `${String(h24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HOUR_OPTIONS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTE_OPTIONS = Array.from({ length: 12 }, (_, i) => i * 5);

const CALENDAR_ERROR_MESSAGES: Record<string, string> = {
  google_not_configured:
    "Google Calendar isn’t set up on this server yet. Try again later, or use iCal / add classes manually.",
  invalid_state: "Google connection failed (session mismatch). Please try again.",
  token_exchange: "Google didn’t accept the connection. Please try again.",
  no_vendor: "We couldn’t find your instructor profile. Refresh and try again.",
  access_denied: "Google Calendar access was denied. You can try again or use another option.",
};

function calendarErrorMessage(code: string | null): string {
  if (!code) return "";
  return CALENDAR_ERROR_MESSAGES[code] ?? `Connection error: ${code}`;
}

export function Step3Schedule({
  classTypes,
  googleConnected,
  googleCalendarId,
  icalUrl,
  calendarType,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleJustConnected = searchParams.get("google_connected") === "1";
  const calError = searchParams.get("error");

  const [option, setOption] = useState<CalendarOption | null>(
    calendarType === "google" ? "google" : calendarType === "ical" ? "ical" : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(calendarErrorMessage(calError));
  const [icalFeedUrl, setIcalFeedUrl] = useState(icalUrl ?? "");
  const [fetchingEvents, setFetchingEvents] = useState(false);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [events, setEvents] = useState<FetchedEvent[]>([]);
  const [eventsFetched, setEventsFetched] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<GoogleCalendarOption[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(googleCalendarId ?? "");
  const [daysWindow, setDaysWindow] = useState<DaysWindow>(90);
  const [eventSearch, setEventSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [hideAllDay, setHideAllDay] = useState(false);
  const [manualSlots, setManualSlots] = useState<ManualSlot[]>([]);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newSlot, setNewSlot] = useState<Omit<ManualSlot, "id">>({
    title: CLASS_TYPE_LABELS[classTypes[0]?.class_type ?? "initial"] ?? "CCW Initial",
    date: "",
    startTime: "09:00",
    duration: 480,
    classType: classTypes[0]?.class_type ?? "initial",
    maxStudents: "",
    price: classTypes[0] ? String(classTypes[0].price) : "",
    recurrence: "one-time",
    endDate: "",
  });

  const activeClassTypes = classTypes.filter((ct) => ct.is_active);

  function mapFetchedEvents(raw: Omit<FetchedEvent, "class_type" | "price" | "include">[]) {
    return raw.map((e) => ({
      ...e,
      class_type: activeClassTypes[0]?.class_type ?? "initial",
      price: String(activeClassTypes[0]?.price ?? ""),
      include: false,
    }));
  }

  async function loadGoogleCalendars(): Promise<string | null> {
    setLoadingCalendars(true);
    setError("");
    try {
      const res = await fetch("/api/calendar/google-calendars");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to list calendars");
      const calendars = (data.calendars as GoogleCalendarOption[]) ?? [];
      setGoogleCalendars(calendars);
      const preferred =
        (data.selectedCalendarId as string | null) ||
        googleCalendarId ||
        calendars.find((c) => c.primary)?.id ||
        calendars[0]?.id ||
        "";
      setSelectedCalendarId(preferred);
      return preferred || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Google calendars.");
      return null;
    } finally {
      setLoadingCalendars(false);
    }
  }

  async function fetchGoogleEvents(calendarId: string, days: DaysWindow = daysWindow) {
    if (!calendarId) return;
    setFetchingEvents(true);
    setError("");
    try {
      const params = new URLSearchParams({
        calendarId,
        days: String(days),
      });
      const res = await fetch(`/api/calendar/google-events?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch Google events");
      setEvents(mapFetchedEvents(data.events ?? []));
      setEventsFetched(true);
      setEventSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load Google Calendar events.");
    } finally {
      setFetchingEvents(false);
    }
  }

  // After OAuth, land on Google option
  useEffect(() => {
    if (googleJustConnected) setOption("google");
  }, [googleJustConnected]);

  // After OAuth (or when returning with Google already connected), load calendars + events
  useEffect(() => {
    if (option !== "google") return;
    if (!(googleConnected || googleJustConnected)) return;

    let cancelled = false;
    (async () => {
      const calendarId = await loadGoogleCalendars();
      if (cancelled || !calendarId) return;
      await fetchGoogleEvents(calendarId, daysWindow);
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally run when entering the Google option / after connect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option, googleConnected, googleJustConnected]);

  async function fetchIcalEvents() {
    if (!icalFeedUrl.trim()) {
      setError("Please enter your calendar feed URL.");
      return;
    }
    setFetchingEvents(true);
    setError("");
    try {
      const res = await fetch("/api/calendar/ical", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: icalFeedUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to fetch");
      setEvents(mapFetchedEvents(data.events ?? []));
      setEventsFetched(true);
      setEventSearch("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load calendar.");
    } finally {
      setFetchingEvents(false);
    }
  }

  function toggleAllEvents(checked: boolean, ids?: string[]) {
    setEvents((ev) =>
      ev.map((e) =>
        !ids || ids.includes(e.external_event_id) ? { ...e, include: checked } : e
      )
    );
  }

  function updateEvent(id: string, fields: Partial<FetchedEvent>) {
    setEvents((ev) =>
      ev.map((e) => (e.external_event_id === id ? { ...e, ...fields } : e))
    );
  }

  async function handleCalendarChange(calendarId: string) {
    setSelectedCalendarId(calendarId);
    setEvents([]);
    setEventsFetched(false);
    await fetchGoogleEvents(calendarId, daysWindow);
  }

  async function handleDaysWindowChange(days: DaysWindow) {
    setDaysWindow(days);
    if (selectedCalendarId) {
      await fetchGoogleEvents(selectedCalendarId, days);
    }
  }

  function addManualSlot() {
    if (!newSlot.date || !newSlot.startTime) {
      setError("Please fill in date and start time.");
      return;
    }
    setManualSlots((prev) => [...prev, { ...newSlot, id: Date.now().toString() }]);
    setNewSlot((s) => ({ ...s, date: "", startTime: "09:00", endDate: "" }));
    setShowAddSlot(false);
    setError("");
  }

  function removeSlot(id: string) {
    setManualSlots((prev) => prev.filter((s) => s.id !== id));
  }

  function selectOption(next: CalendarOption) {
    if (next === option) return;
    setOption(next);
    setEvents([]);
    setEventsFetched(false);
    setEventSearch("");
    setError("");
  }

  function priceForType(typeKey: string): string {
    return String(classTypes.find((ct) => ct.class_type === typeKey)?.price ?? "");
  }

  async function handleSubmit() {
    setError("");
    if (!option) {
      setError("Please select a calendar option.");
      return;
    }

    setSaving(true);
    try {
      let classesToSave: object[] = [];
      let calendarType = option;

      if (option === "manual") {
        classesToSave = manualSlots.map((slot) => {
          const startDt = new Date(`${slot.date}T${slot.startTime}`);
          const endDt = new Date(startDt.getTime() + slot.duration * 60000);
          const recurrenceRule = buildRecurrenceRule(
            slot.recurrence,
            slot.date,
            slot.endDate
          );
          return {
            class_type: slot.classType,
            title: slot.title.trim() || (CLASS_TYPE_LABELS[slot.classType] ?? slot.classType),
            start_time: startDt.toISOString(),
            end_time: endDt.toISOString(),
            max_students: slot.maxStudents ? parseInt(slot.maxStudents) : null,
            price: slot.price ? parseFloat(slot.price) : null,
            is_recurring: slot.recurrence !== "one-time",
            recurrence_rule: recurrenceRule,
          };
        });
      } else {
        classesToSave = events
          .filter((e) => e.include && e.class_type !== "skip")
          .map((e) => ({
            external_event_id: e.external_event_id,
            class_type: e.class_type,
            title: e.title,
            start_time: e.start_time,
            end_time: e.end_time,
            price: e.price ? parseFloat(e.price) : null,
            is_recurring: e.is_recurring,
            recurrence_rule: e.recurrence_rule,
          }));
      }

      const res = await fetch("/api/onboarding/step/3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calendarType,
          icalFeedUrl: option === "ical" ? icalFeedUrl : null,
          googleCalendarId:
            option === "google" && selectedCalendarId ? selectedCalendarId : undefined,
          classes: classesToSave,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      router.push("/onboard/step/4");
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const searchLower = eventSearch.trim().toLowerCase();
  const filteredEvents = events.filter((e) => {
    if (hideAllDay && e.all_day) return false;
    if (searchLower && !e.title.toLowerCase().includes(searchLower)) return false;
    return true;
  });
  const titleSuggestions = Array.from(
    new Set(
      events
        .map((e) => e.title)
        .filter((t) => t && (!searchLower || t.toLowerCase().includes(searchLower)))
    )
  )
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 8);

  const visibleIds = filteredEvents.map((e) => e.external_event_id);
  const allChecked =
    filteredEvents.length > 0 && filteredEvents.every((e) => e.include);
  const noneChecked = filteredEvents.every((e) => !e.include);

  return (
    <div className="space-y-6">
      {/* Option cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Google Calendar */}
        <OptionCard
          selected={option === "google"}
          onClick={() => selectOption("google")}
          icon={
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="4" fill="#4285F4" />
              <path d="M12 11v2h3.5c-.14.9-.84 2.5-3.5 2.5-2.1 0-3.8-1.7-3.8-3.8S9.9 8.2 12 8.2c1.2 0 2 .5 2.4.9l1.6-1.6C14.9 6.6 13.6 6 12 6 8.7 6 6 8.7 6 12s2.7 6 6 6c3.5 0 5.8-2.4 5.8-5.8 0-.4 0-.7-.1-1H12z" fill="white" />
            </svg>
          }
          title="Google Calendar"
          description="Connect and sync automatically"
        />

        {/* iCal */}
        <OptionCard
          selected={option === "ical"}
          onClick={() => selectOption("ical")}
          icon={
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          title="iCal"
          description="Paste a .ics feed URL"
        />

        {/* Manual */}
        <OptionCard
          selected={option === "manual"}
          onClick={() => selectOption("manual")}
          icon={
            <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
          title="Add manually"
          description="Enter class times yourself"
        />
      </div>

      {/* Google Calendar pane */}
      {option === "google" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          {googleConnected || googleJustConnected ? (
            <div className="flex items-center gap-2 text-emerald-700 mb-4">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">Google Calendar connected</span>
            </div>
          ) : (
            <div className="mb-4">
              <a
                href="/api/calendar/google-auth"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="white">
                  <path d="M12 11v2h3.5c-.14.9-.84 2.5-3.5 2.5-2.1 0-3.8-1.7-3.8-3.8S9.9 8.2 12 8.2c1.2 0 2 .5 2.4.9l1.6-1.6C14.9 6.6 13.6 6 12 6 8.7 6 6 8.7 6 12s2.7 6 6 6c3.5 0 5.8-2.4 5.8-5.8 0-.4 0-.7-.1-1H12z" />
                </svg>
                Connect Google Calendar
              </a>
            </div>
          )}

          {(googleConnected || googleJustConnected) && (
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Calendar
                </label>
                <select
                  value={selectedCalendarId}
                  onChange={(e) => void handleCalendarChange(e.target.value)}
                  disabled={loadingCalendars || fetchingEvents || googleCalendars.length === 0}
                  className="input-field w-full text-sm"
                >
                  {googleCalendars.length === 0 && (
                    <option value="">{loadingCalendars ? "Loading calendars…" : "No calendars"}</option>
                  )}
                  {googleCalendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}
                      {cal.primary ? " (Primary)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Time window
                </label>
                <select
                  value={daysWindow}
                  onChange={(e) =>
                    void handleDaysWindowChange(Number(e.target.value) as DaysWindow)
                  }
                  disabled={fetchingEvents || !selectedCalendarId}
                  className="input-field w-full text-sm"
                >
                  {DAYS_WINDOW_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1">
                  Search event names
                </label>
                <input
                  type="search"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    // Delay so suggestion click registers
                    window.setTimeout(() => setSearchFocused(false), 150);
                  }}
                  placeholder="Start typing to filter (e.g. CCW, Renewal)"
                  className="input-field w-full text-sm"
                  disabled={!eventsFetched}
                />
                {searchFocused && eventSearch.trim() && titleSuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-sm">
                    {titleSuggestions.map((title) => (
                      <li key={title}>
                        <button
                          type="button"
                          className="w-full px-3 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setEventSearch(title);
                            setSearchFocused(false);
                          }}
                        >
                          {title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-600 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={hideAllDay}
                  onChange={(e) => setHideAllDay(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300"
                />
                Hide all-day events
              </label>
            </div>
          )}

          {(fetchingEvents || loadingCalendars) && <LoadingEvents />}
          {eventsFetched && !fetchingEvents && filteredEvents.length > 0 && (
            <EventReviewTable
              events={filteredEvents}
              totalCount={events.length}
              classTypes={classTypes}
              allChecked={allChecked}
              noneChecked={noneChecked}
              onToggleAll={(checked) => toggleAllEvents(checked, visibleIds)}
              onUpdateEvent={updateEvent}
            />
          )}
          {eventsFetched && !fetchingEvents && events.length > 0 && filteredEvents.length === 0 && (
            <p className="text-sm text-zinc-500">
              No events match your filters. Try a different search or time window.
            </p>
          )}
          {eventsFetched && !fetchingEvents && events.length === 0 && (
            <p className="text-sm text-zinc-500">
              No upcoming events found in the selected calendar for this time window.
            </p>
          )}
        </div>
      )}

      {/* iCal pane */}
      {option === "ical" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Paste your calendar feed URL (.ics)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={icalFeedUrl}
              onChange={(e) => setIcalFeedUrl(e.target.value)}
              placeholder="webcal://... or https://.../.ics"
              className="input-field flex-1"
            />
            <button
              type="button"
              onClick={fetchIcalEvents}
              disabled={fetchingEvents || !icalFeedUrl.trim()}
              className="btn-primary small w-button whitespace-nowrap disabled:opacity-50"
            >
              {fetchingEvents ? "Fetching..." : "Fetch events"}
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-2">
            In Apple Calendar: right-click your calendar → Share Calendar → copy the public or private .ics URL.
            Outlook: calendar settings → Shared calendars → publish and paste the ICS link here.
          </p>

          {fetchingEvents && <LoadingEvents />}
          {eventsFetched && events.length > 0 && (
            <div className="mt-4">
              <EventReviewTable
                events={events}
                totalCount={events.length}
                classTypes={classTypes}
                allChecked={events.length > 0 && events.every((e) => e.include)}
                noneChecked={events.every((e) => !e.include)}
                onToggleAll={(checked) => toggleAllEvents(checked)}
                onUpdateEvent={updateEvent}
              />
            </div>
          )}
          {eventsFetched && events.length === 0 && (
            <p className="text-sm text-zinc-500 mt-4">No upcoming events found in the next 90 days.</p>
          )}
        </div>
      )}

      {/* Manual pane */}
      {option === "manual" && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
          {manualSlots.length > 0 && (
            <div className="space-y-2">
              {manualSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-800">
                        {slot.title.trim() || (CLASS_TYPE_LABELS[slot.classType] ?? slot.classType)}
                      </p>
                      {slot.recurrence !== "one-time" && (
                        <span className="rounded-full bg-[#c96442]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c96442]">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {describeRecurrence(slot)} · {slot.duration} min
                      {slot.maxStudents ? ` · Max ${slot.maxStudents} students` : ""}
                      {slot.price ? ` · $${slot.price}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSlot(slot.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {showAddSlot ? (
            <div className="space-y-3 border border-zinc-100 rounded-lg p-4 bg-zinc-50">
              <h3 className="text-sm font-medium text-zinc-700">Add a class slot</h3>
              <div>
                <label className="block text-xs text-zinc-600 mb-1">Event name</label>
                <input
                  type="text"
                  value={newSlot.title}
                  onChange={(e) => setNewSlot((s) => ({ ...s, title: e.target.value }))}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-600 mb-1">Repeats</label>
                <select
                  value={newSlot.recurrence}
                  onChange={(e) =>
                    setNewSlot((s) => ({ ...s, recurrence: e.target.value as Recurrence }))
                  }
                  className="input-field w-full"
                >
                  {RECURRENCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {newSlot.recurrence !== "one-time" && newSlot.date && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {describeRecurrence({ ...newSlot, id: "preview" })}
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">
                    {newSlot.recurrence === "one-time" ? "Date" : "Start date"}
                  </label>
                  <input
                    type="date"
                    value={newSlot.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setNewSlot((s) => ({ ...s, date: e.target.value }))}
                    className="input-field w-full"
                  />
                </div>
                {newSlot.recurrence !== "one-time" && (
                  <div>
                    <label className="block text-xs text-zinc-600 mb-1">
                      End date{" "}
                      <span className="text-zinc-400">(optional — leave blank for ongoing)</span>
                    </label>
                    <input
                      type="date"
                      value={newSlot.endDate}
                      min={newSlot.date || new Date().toISOString().split("T")[0]}
                      onChange={(e) => setNewSlot((s) => ({ ...s, endDate: e.target.value }))}
                      className="input-field w-full"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Start time</label>
                  {(() => {
                    const parts = parseTimeParts(newSlot.startTime);
                    const setParts = (
                      next: Partial<{ hour12: number; minute: number; period: "AM" | "PM" }>
                    ) => {
                      const merged = { ...parts, ...next };
                      setNewSlot((s) => ({
                        ...s,
                        startTime: toTimeValue(merged.hour12, merged.minute, merged.period),
                      }));
                    };
                    return (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={parts.hour12}
                          onChange={(e) => setParts({ hour12: Number(e.target.value) })}
                          className="input-field min-w-0 flex-1"
                          aria-label="Hour"
                        >
                          {HOUR_OPTIONS.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>
                        <span className="text-sm text-zinc-500">:</span>
                        <select
                          value={parts.minute}
                          onChange={(e) => setParts({ minute: Number(e.target.value) })}
                          className="input-field min-w-0 flex-1"
                          aria-label="Minute"
                        >
                          {MINUTE_OPTIONS.map((m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                        <select
                          value={parts.period}
                          onChange={(e) =>
                            setParts({ period: e.target.value as "AM" | "PM" })
                          }
                          className="input-field min-w-0 flex-1"
                          aria-label="AM or PM"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Duration</label>
                  <select
                    value={newSlot.duration}
                    onChange={(e) => setNewSlot((s) => ({ ...s, duration: Number(e.target.value) }))}
                    className="input-field w-full"
                  >
                    {[30, 60, 90, 120, 180, 240, 300, 360, 480, 960].map((d) => (
                      <option key={d} value={d}>
                        {d >= 60 ? `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}` : `${d}m`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Class type</label>
                  <select
                    value={newSlot.classType}
                    onChange={(e) => {
                      const val = e.target.value;
                      const nextLabel = CLASS_TYPE_LABELS[val] ?? val;
                      setNewSlot((s) => {
                        const prevLabel = CLASS_TYPE_LABELS[s.classType] ?? s.classType;
                        const titleStillDefault =
                          !s.title.trim() || s.title.trim() === prevLabel;
                        return {
                          ...s,
                          classType: val,
                          price: priceForType(val),
                          title: titleStillDefault ? nextLabel : s.title,
                        };
                      });
                    }}
                    className="input-field w-full"
                  >
                    {activeClassTypes.map((ct) => (
                      <option key={ct.class_type} value={ct.class_type}>
                        {CLASS_TYPE_LABELS[ct.class_type] ?? ct.class_type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Max students</label>
                  <input
                    type="number"
                    min="1"
                    value={newSlot.maxStudents}
                    onChange={(e) => setNewSlot((s) => ({ ...s, maxStudents: e.target.value }))}
                    placeholder="Optional"
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-600 mb-1">Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newSlot.price}
                    onChange={(e) => setNewSlot((s) => ({ ...s, price: e.target.value }))}
                    placeholder="0.00"
                    className="input-field w-full"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={addManualSlot}
                  className="btn-primary small w-button"
                >
                  Add slot
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSlot(false)}
                  className="btn-secondary small w-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddSlot(true)}
              className="btn-secondary small w-button"
            >
              + Add class
            </button>
          )}

          {manualSlots.length === 0 && !showAddSlot && (
            <p className="text-sm text-zinc-400">
              You can always add more slots from your dashboard after publishing.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => router.push("/onboard/step/2")}
          className="btn-secondary w-button"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !option}
          className="btn-primary w-button inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving && <Spinner />}
          {saving ? "Saving…" : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}

function OptionCard({
  selected,
  onClick,
  icon,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? "border-zinc-900 bg-zinc-50"
          : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div className="mb-2">{icon}</div>
      <p className="font-medium text-zinc-800 text-sm">{title}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
    </button>
  );
}

function EventReviewTable({
  events,
  totalCount,
  classTypes,
  allChecked,
  noneChecked,
  onToggleAll,
  onUpdateEvent,
}: {
  events: FetchedEvent[];
  totalCount: number;
  classTypes: VendorClassType[];
  allChecked: boolean;
  noneChecked: boolean;
  onToggleAll: (checked: boolean) => void;
  onUpdateEvent: (id: string, fields: Partial<FetchedEvent>) => void;
}) {
  const activeTypes = classTypes.filter((ct) => ct.is_active);
  const filteredNote =
    totalCount !== events.length
      ? `${events.length} of ${totalCount} events shown`
      : `${events.length} events found`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <p className="text-sm font-medium text-zinc-700">{filteredNote}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onToggleAll(true)}
            disabled={allChecked || events.length === 0}
            className="text-xs text-zinc-600 hover:text-zinc-900 underline disabled:opacity-40 disabled:no-underline"
          >
            Select all
          </button>
          <span className="text-zinc-300">|</span>
          <button
            type="button"
            onClick={() => onToggleAll(false)}
            disabled={noneChecked || events.length === 0}
            className="text-xs text-zinc-600 hover:text-zinc-900 underline disabled:opacity-40 disabled:no-underline"
          >
            Deselect all
          </button>
        </div>
      </div>
      <p className="text-xs text-zinc-500 mb-2">
        Nothing is selected by default — check the classes you want to import.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 whitespace-nowrap">Date &amp; Time</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500">Event Title</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500">Class Type</th>
              <th className="text-left py-2 pr-4 text-xs font-medium text-zinc-500 whitespace-nowrap">Price ($)</th>
              <th className="text-left py-2 text-xs font-medium text-zinc-500">Include</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.external_event_id} className="border-b border-zinc-50">
                <td className="py-2 pr-4 whitespace-nowrap text-zinc-600 text-xs">
                  {event.all_day
                    ? new Date(event.start_time).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      }) + " (all day)"
                    : new Date(event.start_time).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                </td>
                <td className="py-2 pr-4 text-zinc-700 max-w-[160px] truncate">
                  {event.title}
                </td>
                <td className="py-2 pr-4">
                  <select
                    value={event.class_type}
                    onChange={(e) => {
                      const val = e.target.value;
                      const price = classTypes.find((ct) => ct.class_type === val)?.price;
                      onUpdateEvent(event.external_event_id, {
                        class_type: val,
                        price: price ? String(price) : event.price,
                      });
                    }}
                    className="text-xs border border-zinc-200 rounded px-2 py-1"
                  >
                    {activeTypes.map((ct) => (
                      <option key={ct.class_type} value={ct.class_type}>
                        {ct.class_type === "initial"
                          ? "Initial"
                          : ct.class_type === "renewal"
                          ? "Renewal"
                          : "Add-A-Gun"}
                      </option>
                    ))}
                    <option value="skip">Skip this event</option>
                  </select>
                </td>
                <td className="py-2 pr-4">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={event.price}
                    onChange={(e) =>
                      onUpdateEvent(event.external_event_id, { price: e.target.value })
                    }
                    className="w-20 text-xs border border-zinc-200 rounded px-2 py-1"
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={event.include}
                    onChange={(e) =>
                      onUpdateEvent(event.external_event_id, { include: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-zinc-300"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LoadingEvents() {
  return (
    <div className="flex items-center gap-2 text-zinc-500 text-sm mt-4">
      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Fetching calendar events...
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
