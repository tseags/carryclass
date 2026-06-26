/**
 * Server-only database helpers for the instructor onboarding flow.
 * All operations are authenticated via Clerk userId before reaching Supabase.
 */
import { supabaseAdmin } from "./supabase-admin";

export interface VendorProfile {
  id: string;
  clerk_user_id: string | null;
  canonical_name: string;
  normalized_name: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  county: string | null;
  bio: string | null;
  photo_url: string | null;
  gallery_urls: string[] | null;
  badge_tags: string[] | null;
  cancellation_policy: string | null;
  cancellation_hours: number | null;
  cancellation_refund_percent: number | null;
  stripe_account_id: string | null;
  is_published: boolean;
  onboarding_step: number;
  calendar_type: string | null;
  ical_feed_url: string | null;
  google_calendar_id: string | null;
  google_refresh_token: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorClassType {
  id: string;
  vendor_id: string;
  class_type: string;
  price: number;
  is_active: boolean;
}

export interface VendorCalendarClass {
  id: string;
  vendor_id: string;
  external_event_id: string | null;
  class_type: string | null;
  title: string | null;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  max_students: number | null;
  price: number | null;
  is_active: boolean;
}

export interface VendorEmailTemplate {
  id: string;
  vendor_id: string;
  type: string;
  subject: string | null;
  body: string | null;
  is_active: boolean;
  send_timing: string | null;
}

/** Find or create a vendor profile row for the given Clerk user. */
export async function getOrCreateVendorProfile(
  clerkUserId: string,
  initialData?: { name?: string; email?: string }
): Promise<VendorProfile> {
  const db = supabaseAdmin();

  const { data: existing } = await db
    .from("vendors")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (existing) return existing as VendorProfile;

  const displayName = initialData?.name ?? "New Instructor";
  const uniqueSuffix = clerkUserId.slice(-8);
  const normalizedName = `clerk_${uniqueSuffix}`;

  const { data: created, error } = await db
    .from("vendors")
    .insert({
      clerk_user_id: clerkUserId,
      canonical_name: displayName,
      normalized_name: normalizedName,
      name: initialData?.name ?? null,
      email: initialData?.email ?? null,
      onboarding_step: 1,
      is_published: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create vendor profile: ${error.message}`);
  return created as VendorProfile;
}

/** Shape of the public enriched directory listing we merge from. */
interface EnrichedListing {
  vendor_name: string | null;
  email: string | null;
  phone: string | null;
  website_url: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  vendor_description: string | null;
  price_16hr_full: string | null;
  price_8hr_renewal: string | null;
  price_add_a_gun: string | null;
  logo_path: string | null;
  instructor_image_paths: string | null;
  training_image_paths: string | null;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** Parse a free-form price string ("$150", "150.00", "150/class") into a number. */
function parsePrice(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = String(raw).replace(/,/g, "").match(/\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Treat a value as an already-usable image if it is an absolute http(s) URL. */
function absoluteUrls(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw)
    .split(/[\n,|]/)
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

/**
 * Look up canonical/enriched directory data for a freshly-created onboarding
 * vendor and merge it into empty profile fields. Never overwrites values the
 * user has already entered. Matches by email first, then by normalized name.
 *
 * Returns the (possibly updated) vendor plus a flag indicating whether any
 * fields were pre-filled, so the UI can surface a subtle hint.
 */
export async function prefillVendorFromEnriched(
  vendor: VendorProfile
): Promise<{ vendor: VendorProfile; prefilled: boolean }> {
  // Only attempt while the profile is still largely empty (first visit to step 1).
  const looksEmpty =
    !vendor.bio && !vendor.phone && !vendor.website && !vendor.address;
  if (!looksEmpty) return { vendor, prefilled: false };

  const db = supabaseAdmin();
  let listing: EnrichedListing | null = null;

  const columns =
    "vendor_name, email, phone, website_url, address, city, county, vendor_description, price_16hr_full, price_8hr_renewal, price_add_a_gun, logo_path, instructor_image_paths, training_image_paths";

  // 1) Match by email (most reliable signal a row belongs to this account).
  if (vendor.email) {
    const { data } = await db
      .from("enriched_vendor_county_listings")
      .select(columns)
      .ilike("email", vendor.email)
      .limit(1)
      .maybeSingle();
    listing = (data as EnrichedListing | null) ?? null;
  }

  // 2) Fall back to a normalized business-name match.
  if (!listing && vendor.canonical_name) {
    const { data } = await db
      .from("enriched_vendor_county_listings")
      .select(columns)
      .eq("normalized_vendor_name", normalizeName(vendor.canonical_name))
      .limit(1)
      .maybeSingle();
    listing = (data as EnrichedListing | null) ?? null;
  }

  if (!listing) return { vendor, prefilled: false };

  // Build a patch that only fills fields the user has not set yet.
  const patch: Partial<VendorProfile> = {};
  if (!vendor.bio && listing.vendor_description) patch.bio = listing.vendor_description;
  if (!vendor.email && listing.email) patch.email = listing.email;
  if (!vendor.phone && listing.phone) patch.phone = listing.phone;
  if (!vendor.website && listing.website_url) patch.website = listing.website_url;
  if (!vendor.address && listing.address) patch.address = listing.address;
  if (!vendor.county && listing.county) patch.county = listing.county;

  if (!vendor.photo_url) {
    const logo = absoluteUrls(listing.logo_path)[0];
    if (logo) patch.photo_url = logo;
  }
  if (!vendor.gallery_urls || vendor.gallery_urls.length === 0) {
    const gallery = [
      ...absoluteUrls(listing.instructor_image_paths),
      ...absoluteUrls(listing.training_image_paths),
    ].slice(0, 5);
    if (gallery.length) patch.gallery_urls = gallery;
  }

  // Seed class-type pricing defaults if the vendor has none yet.
  const existingTypes = await getClassTypes(vendor.id);
  if (existingTypes.length === 0) {
    const seeds: Array<{ class_type: string; price: number; is_active: boolean }> = [];
    const initial = parsePrice(listing.price_16hr_full);
    const renewal = parsePrice(listing.price_8hr_renewal);
    const addGun = parsePrice(listing.price_add_a_gun);
    if (initial) seeds.push({ class_type: "initial", price: initial, is_active: false });
    if (renewal) seeds.push({ class_type: "renewal", price: renewal, is_active: false });
    if (addGun) seeds.push({ class_type: "add_a_gun", price: addGun, is_active: false });
    if (seeds.length) await upsertClassTypes(vendor.id, seeds);
  }

  const prefilled = Object.keys(patch).length > 0;
  if (prefilled) {
    await updateVendorProfile(vendor.id, patch);
    return { vendor: { ...vendor, ...patch }, prefilled: true };
  }

  return { vendor, prefilled: false };
}

/** Fetch the vendor profile for a Clerk user. Returns null if not found. */
export async function getVendorProfile(
  clerkUserId: string
): Promise<VendorProfile | null> {
  const { data } = await supabaseAdmin()
    .from("vendors")
    .select("*")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
  return (data as VendorProfile | null) ?? null;
}

/** Patch the vendor profile. */
export async function updateVendorProfile(
  vendorId: string,
  updates: Partial<VendorProfile>
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("vendors")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", vendorId);
  if (error) throw new Error(`Failed to update vendor: ${error.message}`);
}

/** Advance the onboarding step (only forward, never backward). */
export async function advanceOnboardingStep(
  vendorId: string,
  targetStep: number
): Promise<void> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("vendors")
    .select("onboarding_step")
    .eq("id", vendorId)
    .single();
  const current = (data as { onboarding_step: number } | null)?.onboarding_step ?? 1;
  if (targetStep > current) {
    await db
      .from("vendors")
      .update({ onboarding_step: targetStep, updated_at: new Date().toISOString() })
      .eq("id", vendorId);
  }
}

// ── Class types ──────────────────────────────────────────────────────────────

export async function getClassTypes(vendorId: string): Promise<VendorClassType[]> {
  const { data } = await supabaseAdmin()
    .from("vendor_class_types")
    .select("*")
    .eq("vendor_id", vendorId);
  return (data ?? []) as VendorClassType[];
}

export async function upsertClassTypes(
  vendorId: string,
  types: Array<{ class_type: string; price: number; is_active: boolean }>
): Promise<void> {
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("vendor_class_types")
    .select("id, class_type")
    .eq("vendor_id", vendorId);

  const existingMap = new Map(
    ((existing as VendorClassType[]) ?? []).map((r) => [r.class_type, r.id])
  );

  for (const t of types) {
    const existingId = existingMap.get(t.class_type);
    if (existingId) {
      await db
        .from("vendor_class_types")
        .update({ price: t.price, is_active: t.is_active })
        .eq("id", existingId);
    } else {
      await db.from("vendor_class_types").insert({
        vendor_id: vendorId,
        class_type: t.class_type,
        price: t.price,
        is_active: t.is_active,
      });
    }
  }
}

// ── Calendar classes ──────────────────────────────────────────────────────────

export async function getCalendarClasses(
  vendorId: string
): Promise<VendorCalendarClass[]> {
  const { data } = await supabaseAdmin()
    .from("vendor_calendar_classes")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .order("start_time");
  return (data ?? []) as VendorCalendarClass[];
}

export async function insertCalendarClasses(
  vendorId: string,
  classes: Array<{
    external_event_id?: string | null;
    class_type?: string | null;
    title?: string | null;
    start_time: string;
    end_time: string;
    max_students?: number | null;
    price?: number | null;
    is_recurring?: boolean;
    recurrence_rule?: string | null;
  }>
): Promise<void> {
  if (!classes.length) return;
  const rows = classes.map((c) => ({ vendor_id: vendorId, ...c }));
  const { error } = await supabaseAdmin()
    .from("vendor_calendar_classes")
    .insert(rows);
  if (error) throw new Error(`Failed to insert calendar classes: ${error.message}`);
}

/** Update a single calendar class (scoped to its owning vendor). */
export async function updateCalendarClass(
  classId: string,
  vendorId: string,
  fields: {
    title?: string | null;
    start_time?: string;
    end_time?: string;
    max_students?: number | null;
    price?: number | null;
  }
): Promise<VendorCalendarClass | null> {
  const { data, error } = await supabaseAdmin()
    .from("vendor_calendar_classes")
    .update(fields)
    .eq("id", classId)
    .eq("vendor_id", vendorId)
    .select("*")
    .single();
  if (error) throw new Error(`Failed to update calendar class: ${error.message}`);
  return (data as VendorCalendarClass) ?? null;
}

/** Cancel (soft-delete) a calendar class by flipping is_active off. */
export async function cancelCalendarClass(
  classId: string,
  vendorId: string
): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("vendor_calendar_classes")
    .update({ is_active: false })
    .eq("id", classId)
    .eq("vendor_id", vendorId);
  if (error) throw new Error(`Failed to cancel calendar class: ${error.message}`);
}

export async function syncCalendarClasses(
  vendorId: string,
  incoming: Array<{
    external_event_id: string;
    title: string;
    start_time: string;
    end_time: string;
    is_recurring: boolean;
    recurrence_rule?: string | null;
  }>
): Promise<{ inserted: number; updated: number; deactivated: number }> {
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("vendor_calendar_classes")
    .select("*")
    .eq("vendor_id", vendorId);

  const existingMap = new Map(
    ((existing as VendorCalendarClass[]) ?? []).map((r) => [r.external_event_id, r])
  );
  const incomingIds = new Set(incoming.map((e) => e.external_event_id));

  let inserted = 0;
  let updated = 0;
  let deactivated = 0;

  // Insert new + update changed
  for (const event of incoming) {
    const current = existingMap.get(event.external_event_id);
    if (!current) {
      await db.from("vendor_calendar_classes").insert({
        vendor_id: vendorId,
        external_event_id: event.external_event_id,
        title: event.title,
        start_time: event.start_time,
        end_time: event.end_time,
        is_recurring: event.is_recurring,
        recurrence_rule: event.recurrence_rule ?? null,
        is_active: true,
        class_type: null,
        last_synced_at: new Date().toISOString(),
      });
      inserted++;
    } else if (
      current.start_time !== event.start_time ||
      current.end_time !== event.end_time
    ) {
      await db
        .from("vendor_calendar_classes")
        .update({
          start_time: event.start_time,
          end_time: event.end_time,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", current.id);
      updated++;
    }
  }

  // Deactivate removed events
  for (const [extId, row] of existingMap) {
    if (extId && !incomingIds.has(extId) && row.is_active) {
      await db
        .from("vendor_calendar_classes")
        .update({ is_active: false, last_synced_at: new Date().toISOString() })
        .eq("id", row.id);
      deactivated++;
    }
  }

  return { inserted, updated, deactivated };
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function getEmailTemplates(
  vendorId: string
): Promise<VendorEmailTemplate[]> {
  const { data } = await supabaseAdmin()
    .from("vendor_email_templates")
    .select("*")
    .eq("vendor_id", vendorId);
  return (data ?? []) as VendorEmailTemplate[];
}

export async function upsertEmailTemplate(
  vendorId: string,
  type: string,
  fields: Partial<Pick<VendorEmailTemplate, "subject" | "body" | "is_active" | "send_timing">>
): Promise<void> {
  const db = supabaseAdmin();
  const { data: existing } = await db
    .from("vendor_email_templates")
    .select("id")
    .eq("vendor_id", vendorId)
    .eq("type", type)
    .maybeSingle();

  if (existing) {
    await db
      .from("vendor_email_templates")
      .update(fields)
      .eq("id", (existing as { id: string }).id);
  } else {
    await db.from("vendor_email_templates").insert({
      vendor_id: vendorId,
      type,
      ...fields,
    });
  }
}
