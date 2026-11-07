/**
 * Refresh OutreachContact rows from `carry_class_vendor_data` (read only, via DATABASE_URL).
 *
 * Read-only count on 2026-10-29: 1,169 listing rows → 636 deduped CA instructors.
 *   website-no-booking 287 · website-has-booking 130 · no-website 219
 *   multi-county 225 · multi-location 28 · has-email 493 · no-email 143
 *   has-phone 621 · no-phone 15 · on-carryclass 0 · needs-review 259
 * website-no-booking by booking_capability: inquiry_only 177 · unclear 43 · none 16 · blank 51
 *
 * Sync only rewrites derived listing fields and tags. Stage, next action,
 * do-not-contact, bookingTool, and activity are never touched. Curated tags in
 * PRESERVED_OUTREACH_TAGS (e.g. uscca) are kept when already present. When
 * bookingCapabilityLocked is set, website booking tags + capability stay put.
 */

import { prisma } from "@/lib/db";
import { getCarryClassDirectorySlugBySourceRowId } from "@/lib/vendors-db";
import {
  applyBookingToolTag,
  replaceWebsiteBookingTags,
  websiteBookingFromTags,
  type BookingTool,
} from "./booking";
import {
  countTags,
  dedupeOutreachRows,
  mergePreservedTags,
  nameKey,
  phoneKey,
  websiteKey,
  type DedupedOutreachContact,
  type OutreachSourceRow,
  type OutreachTag,
} from "./dedupe";

export interface OutreachSyncReport {
  sourceRows: number;
  contacts: number;
  created: number;
  updated: number;
  tagCounts: Record<OutreachTag, number>;
}

async function readListingRows(): Promise<OutreachSourceRow[]> {
  return prisma.$queryRawUnsafe<OutreachSourceRow[]>(
    `SELECT id::text AS id, county, needs_review, vendor_name, instructor_names, email, phone,
            website_url, booking_capability, city, address, crawl_status, enrichment_confidence,
            confidence_notes, hidden_from_directory, accepts_bookings, stripe_connect_account_id
       FROM public.carry_class_vendor_data`
  );
}

/** Booking-platform vendors (Prisma `Vendor`) that already take bookings on CarryClass. */
async function bookingVendorKeys(): Promise<Set<string>> {
  const vendors = await prisma.vendor.findMany({
    where: { OR: [{ acceptsBookings: true }, { stripeConnectAccountId: { not: null } }] },
    select: { website: true, phone: true, name: true },
  });
  const keys = new Set<string>();
  for (const v of vendors) {
    const web = websiteKey(v.website);
    if (web) keys.add(`web:${web}`);
    const tel = phoneKey(v.phone);
    if (tel) keys.add(`tel:${tel}`);
    keys.add(`name:${nameKey(v.name)}`);
  }
  return keys;
}

function matchesBookingVendor(contact: DedupedOutreachContact, keys: Set<string>): boolean {
  if (keys.size === 0) return false;
  if (contact.website && keys.has(`web:${websiteKey(contact.website)}`)) return true;
  if (contact.phones.some((p) => keys.has(`tel:${phoneKey(p)}`))) return true;
  return keys.has(`name:${nameKey(contact.displayName)}`);
}

function directorySlugFor(contact: DedupedOutreachContact, slugs: Map<string, string>): string | null {
  const votes = new Map<string, number>();
  for (const id of contact.sourceListingIds) {
    const slug = slugs.get(id);
    if (slug) votes.set(slug, (votes.get(slug) ?? 0) + 1);
  }
  return [...votes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export async function buildOutreachContacts(): Promise<{
  rows: OutreachSourceRow[];
  contacts: DedupedOutreachContact[];
  directorySlugs: Map<string, string>;
}> {
  const [rows, bookingKeys, directorySlugs] = await Promise.all([
    readListingRows(),
    bookingVendorKeys(),
    getCarryClassDirectorySlugBySourceRowId(),
  ]);
  const contacts = dedupeOutreachRows(rows).map((c) =>
    !c.tags.includes("on-carryclass") && matchesBookingVendor(c, bookingKeys)
      ? { ...c, tags: [...c.tags, "on-carryclass" as const] }
      : c
  );
  return { rows, contacts, directorySlugs };
}

export async function syncOutreachContacts(): Promise<OutreachSyncReport> {
  const { rows, contacts, directorySlugs } = await buildOutreachContacts();

  const existing = await prisma.outreachContact.findMany({
    select: {
      id: true,
      dedupeKey: true,
      sourceListingIds: true,
      tags: true,
      bookingCapability: true,
      bookingCapabilityLocked: true,
      bookingTool: true,
    },
  });
  const byKey = new Map(existing.map((e) => [e.dedupeKey, e.id]));
  const byId = new Map(existing.map((e) => [e.id, e]));
  const bySourceId = new Map<string, string>();
  for (const e of existing) for (const id of e.sourceListingIds) bySourceId.set(id, e.id);

  const claimed = new Set<string>();
  let created = 0;
  let updated = 0;
  const now = new Date();
  const writes: Array<() => Promise<unknown>> = [];

  for (const contact of contacts) {
    // Match on the dedupe key first; fall back to a shared listing row so a
    // contact whose website changed keeps its stage and history.
    let matchId = byKey.get(contact.dedupeKey);
    if (!matchId || claimed.has(matchId)) {
      matchId = contact.sourceListingIds.map((id) => bySourceId.get(id)).find(
        (id): id is string => Boolean(id) && !claimed.has(id as string)
      );
    }

    const prior = matchId ? byId.get(matchId) : undefined;
    let tags = mergePreservedTags(contact.tags, prior?.tags ?? null);
    let bookingCapability = contact.bookingCapability;
    if (prior?.bookingCapabilityLocked) {
      const lockedSegment = websiteBookingFromTags(prior.tags);
      tags = replaceWebsiteBookingTags(tags, lockedSegment);
      tags = mergePreservedTags(tags, prior.tags);
      bookingCapability = prior.bookingCapability;
    }
    if (prior?.bookingTool) {
      tags = applyBookingToolTag(tags, prior.bookingTool as BookingTool);
    }

    const data = {
      dedupeKey: contact.dedupeKey,
      displayName: contact.displayName,
      instructorNames: contact.instructorNames,
      emails: contact.emails,
      phones: contact.phones,
      website: contact.website,
      addresses: contact.addresses,
      city: contact.city,
      counties: contact.counties,
      primaryCounty: contact.primaryCounty,
      bookingCapability,
      directorySlug: directorySlugFor(contact, directorySlugs),
      sourceListingIds: contact.sourceListingIds,
      tags,
      syncedAt: now,
    };

    if (matchId) {
      const id = matchId;
      claimed.add(id);
      const keyOwner = byKey.get(contact.dedupeKey);
      // When another existing row already owns this key, keep this row's key so the unique index holds.
      const { dedupeKey, ...rest } = data;
      const patch = keyOwner && keyOwner !== id ? rest : { ...rest, dedupeKey };
      writes.push(() => prisma.outreachContact.update({ where: { id }, data: patch }));
      updated += 1;
    } else {
      writes.push(() => prisma.outreachContact.create({ data }));
      created += 1;
    }
  }

  for (let i = 0; i < writes.length; i += 20) {
    await Promise.all(writes.slice(i, i + 20).map((write) => write()));
  }

  return {
    sourceRows: rows.length,
    contacts: contacts.length,
    created,
    updated,
    tagCounts: countTags(contacts),
  };
}
