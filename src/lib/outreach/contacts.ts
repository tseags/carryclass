import type { OutreachActivity, OutreachContact, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applyBookingToolTag,
  applyWebsiteBooking,
  isBookingTool,
  isWebsiteBookingOption,
  type BookingTool,
  type WebsiteBookingOption,
} from "./booking";
import {
  defaultNextActionForStage,
  stageAfterCall,
  stageAfterEmail,
  type CallDisposition,
  type OutreachStageId,
  type StageState,
} from "./sequence";

export interface OutreachContactView {
  id: string;
  displayName: string;
  instructorNames: string[];
  emails: string[];
  phones: string[];
  website: string | null;
  addresses: string[];
  city: string | null;
  counties: string[];
  primaryCounty: string | null;
  bookingCapability: string | null;
  bookingCapabilityLocked: boolean;
  bookingTool: string | null;
  directorySlug: string | null;
  tags: string[];
  stage: OutreachStageId;
  nextActionAt: string | null;
  lastContactedAt: string | null;
  doNotContact: boolean;
}

export interface OutreachActivityView {
  id: string;
  type: "note" | "stage_change" | "email" | "call";
  body: string | null;
  occurredAt: string;
  fromStage: OutreachStageId | null;
  toStage: OutreachStageId | null;
  disposition: CallDisposition | null;
  durationSeconds: number | null;
  phone: string | null;
  zohoMessageId: string | null;
}

export function toContactView(c: OutreachContact): OutreachContactView {
  return {
    id: c.id,
    displayName: c.displayName,
    instructorNames: c.instructorNames,
    emails: c.emails,
    phones: c.phones,
    website: c.website,
    addresses: c.addresses,
    city: c.city,
    counties: c.counties,
    primaryCounty: c.primaryCounty,
    bookingCapability: c.bookingCapability,
    bookingCapabilityLocked: c.bookingCapabilityLocked,
    bookingTool: c.bookingTool,
    directorySlug: c.directorySlug,
    tags: c.tags,
    stage: c.stage,
    nextActionAt: c.nextActionAt?.toISOString() ?? null,
    lastContactedAt: c.lastContactedAt?.toISOString() ?? null,
    doNotContact: c.doNotContact,
  };
}

export function toActivityView(a: OutreachActivity): OutreachActivityView {
  return {
    id: a.id,
    type: a.type,
    body: a.body,
    occurredAt: a.occurredAt.toISOString(),
    fromStage: a.fromStage,
    toStage: a.toStage,
    disposition: a.disposition,
    durationSeconds: a.durationSeconds,
    phone: a.phone,
    zohoMessageId: a.zohoMessageId,
  };
}

export async function listOutreachContacts(): Promise<OutreachContactView[]> {
  const rows = await prisma.outreachContact.findMany({ orderBy: { displayName: "asc" } });
  return rows.map(toContactView);
}

export async function getOutreachContact(id: string) {
  const contact = await prisma.outreachContact.findUnique({
    where: { id },
    include: { activities: { orderBy: { occurredAt: "desc" } } },
  });
  if (!contact) return null;
  return {
    contact: toContactView(contact),
    activities: contact.activities.map(toActivityView),
  };
}

export class OutreachInputError extends Error {}

/**
 * Write the contact's new stage/next-action plus the activity rows that explain it,
 * in one transaction.
 */
async function commit(
  current: OutreachContact,
  next: StageState & { doNotContact?: boolean; lastContactedAt?: Date },
  activity: Omit<Prisma.OutreachActivityUncheckedCreateInput, "contactId"> | null
) {
  const stageChanged = next.stage !== current.stage;
  const ops = [];
  if (activity) {
    ops.push(prisma.outreachActivity.create({ data: { ...activity, contactId: current.id } }));
  }
  if (stageChanged) {
    ops.push(
      prisma.outreachActivity.create({
        data: {
          contactId: current.id,
          type: "stage_change",
          fromStage: current.stage,
          toStage: next.stage,
        },
      })
    );
  }
  ops.push(
    prisma.outreachContact.update({
      where: { id: current.id },
      data: {
        stage: next.stage,
        nextActionAt: next.nextActionAt,
        doNotContact: next.doNotContact ?? next.stage === "do_not_contact",
        ...(next.lastContactedAt ? { lastContactedAt: next.lastContactedAt } : {}),
      },
    })
  );
  await prisma.$transaction(ops);
}

async function loadContact(id: string): Promise<OutreachContact> {
  const c = await prisma.outreachContact.findUnique({ where: { id } });
  if (!c) throw new OutreachInputError("Contact not found");
  return c;
}

export async function updateOutreachStage(
  id: string,
  input: { stage?: OutreachStageId; nextActionAt?: Date | null }
): Promise<void> {
  const current = await loadContact(id);
  const stage = input.stage ?? current.stage;
  const nextActionAt =
    input.nextActionAt !== undefined
      ? input.nextActionAt
      : input.stage && input.stage !== current.stage
        ? defaultNextActionForStage(input.stage)
        : current.nextActionAt;
  await commit(current, { stage, nextActionAt }, null);
}

/**
 * Manual website-booking / booking-tool curation. Locks bookingCapability so
 * the next directory sync won't wipe the person's choice.
 */
export async function updateOutreachListing(
  id: string,
  input: {
    websiteBooking?: WebsiteBookingOption;
    bookingTool?: BookingTool | null;
  }
): Promise<void> {
  const current = await loadContact(id);
  let tags = current.tags;
  let bookingCapability = current.bookingCapability;
  let bookingCapabilityLocked = current.bookingCapabilityLocked;
  let bookingTool = current.bookingTool;

  if (input.websiteBooking !== undefined) {
    if (!isWebsiteBookingOption(input.websiteBooking)) {
      throw new OutreachInputError("Unknown website booking option");
    }
    const next = applyWebsiteBooking(tags, input.websiteBooking);
    tags = next.tags;
    bookingCapability = next.bookingCapability;
    bookingCapabilityLocked = true;
  }

  if (input.bookingTool !== undefined) {
    if (input.bookingTool !== null && !isBookingTool(input.bookingTool)) {
      throw new OutreachInputError("Unknown booking tool");
    }
    bookingTool = input.bookingTool;
    tags = applyBookingToolTag(tags, input.bookingTool);
  }

  await prisma.outreachContact.update({
    where: { id: current.id },
    data: { tags, bookingCapability, bookingCapabilityLocked, bookingTool },
  });
}

export async function addOutreachNote(id: string, body: string): Promise<void> {
  const current = await loadContact(id);
  await prisma.outreachActivity.create({ data: { contactId: current.id, type: "note", body } });
}

export async function logOutreachCall(
  id: string,
  input: {
    disposition: CallDisposition;
    phone: string | null;
    durationSeconds: number | null;
    twilioCallSid: string | null;
    body: string | null;
    nextActionAt?: Date | null;
  }
): Promise<void> {
  const current = await loadContact(id);
  if (current.doNotContact) throw new OutreachInputError("This contact is marked do not contact");
  const now = new Date();
  const next = stageAfterCall(
    { stage: current.stage, nextActionAt: current.nextActionAt },
    now,
    input.disposition
  );
  await commit(
    current,
    {
      ...next,
      nextActionAt: input.nextActionAt !== undefined ? input.nextActionAt : next.nextActionAt,
      lastContactedAt: now,
    },
    {
      type: "call",
      disposition: input.disposition,
      phone: input.phone,
      durationSeconds: input.durationSeconds,
      twilioCallSid: input.twilioCallSid,
      body: input.body,
      occurredAt: now,
    }
  );
}

export async function logOutreachEmail(
  id: string,
  input: { body: string | null; zohoMessageId: string | null; nextActionAt?: Date | null }
): Promise<void> {
  const current = await loadContact(id);
  if (current.doNotContact) throw new OutreachInputError("This contact is marked do not contact");
  const now = new Date();
  const next = stageAfterEmail({ stage: current.stage, nextActionAt: current.nextActionAt }, now);
  await commit(
    current,
    {
      ...next,
      nextActionAt: input.nextActionAt !== undefined ? input.nextActionAt : next.nextActionAt,
      lastContactedAt: now,
    },
    { type: "email", body: input.body, zohoMessageId: input.zohoMessageId, occurredAt: now }
  );
}
