/**
 * One-page (or more, if the fee list is long) payment receipt for a booking.
 * Standard fonts only, so it downloads in the browser without a print stylesheet.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type { BookingConfirmation } from "@/lib/booking-confirmation";
import { PLATFORM_FEE_LINE_LABEL, formatCents } from "@/lib/instructor-catalog";

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 54;
const RIGHT = PAGE_W - MARGIN;
const CONTENT_W = RIGHT - MARGIN;
const FOOTER_CLEARANCE = 96;

const INK = rgb(20 / 255, 20 / 255, 19 / 255);
const MUTED = rgb(94 / 255, 93 / 255, 89 / 255);
const RULE = rgb(226 / 255, 224 / 255, 218 / 255);
const CREAM = rgb(242 / 255, 239 / 255, 232 / 255);
const ACCENT = rgb(201 / 255, 100 / 255, 66 / 255);
const GREEN = rgb(4 / 255, 120 / 255, 87 / 255);

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
  code: string;
};

function formatInTz(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  const date = new Date(iso);
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

function pdfText(font: PDFFont, value: string): string {
  const normalized = value.replace(/\u00A0/g, " ").replace(/[\u0000-\u001F]/g, "").trim();
  if (!normalized) return "";
  try {
    font.encodeText(normalized);
    return normalized;
  } catch {
    let out = "";
    for (const ch of normalized) {
      try {
        font.encodeText(ch);
        out += ch;
      } catch {
        // Standard fonts cannot encode every Unicode character.
      }
    }
    return out;
  }
}

function wrap(font: PDFFont, value: string, size: number, maxWidth: number): string[] {
  const safe = pdfText(font, value);
  if (!safe) return [];
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  const pushLongWord = (word: string) => {
    let chunk = "";
    for (const ch of word) {
      const trial = chunk + ch;
      if (chunk && font.widthOfTextAtSize(trial, size) > maxWidth) {
        lines.push(chunk);
        chunk = ch;
      } else {
        chunk = trial;
      }
    }
    current = chunk;
  };

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = "";
    if (font.widthOfTextAtSize(word, size) <= maxWidth) current = word;
    else pushLongWord(word);
  }
  if (current) lines.push(current);
  return lines;
}

function rule(ctx: Ctx) {
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: RIGHT, y: ctx.y },
    thickness: 0.75,
    color: RULE,
  });
}

function continuationHeader(ctx: Ctx) {
  const label = pdfText(ctx.font, `CarryClass receipt  ·  ${ctx.code}`);
  ctx.page.drawText(label, {
    x: MARGIN,
    y: PAGE_H - 40,
    size: 9,
    font: ctx.bold,
    color: MUTED,
  });
  ctx.page.drawLine({
    start: { x: MARGIN, y: PAGE_H - 50 },
    end: { x: RIGHT, y: PAGE_H - 50 },
    thickness: 0.6,
    color: RULE,
  });
  ctx.y = PAGE_H - 74;
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed >= FOOTER_CLEARANCE) return;
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  continuationHeader(ctx);
}

function drawFooter(ctx: Ctx) {
  const y = 46;
  ctx.page.drawLine({
    start: { x: MARGIN, y: 68 },
    end: { x: RIGHT, y: 68 },
    thickness: 0.6,
    color: RULE,
  });
  ctx.page.drawText("CarryClass", {
    x: MARGIN,
    y,
    size: 9,
    font: ctx.bold,
    color: INK,
  });
  const site = "getcarryclass.com";
  const siteW = ctx.font.widthOfTextAtSize(site, 9);
  ctx.page.drawText(site, {
    x: (PAGE_W - siteW) / 2,
    y,
    size: 9,
    font: ctx.font,
    color: MUTED,
  });
  const email = "bookings@getcarryclass.com";
  const emailW = ctx.font.widthOfTextAtSize(email, 9);
  ctx.page.drawText(email, {
    x: RIGHT - emailW,
    y,
    size: 9,
    font: ctx.font,
    color: MUTED,
  });
}

function drawHeader(ctx: Ctx) {
  const { page } = ctx;
  page.drawRectangle({ x: 0, y: PAGE_H - 6, width: PAGE_W, height: 6, color: ACCENT });
  page.drawRectangle({ x: 0, y: PAGE_H - 118, width: PAGE_W, height: 112, color: CREAM });
  page.drawText("CarryClass", {
    x: MARGIN,
    y: PAGE_H - 64,
    size: 22,
    font: ctx.bold,
    color: INK,
  });
  page.drawText("Payment receipt", {
    x: MARGIN,
    y: PAGE_H - 84,
    size: 11,
    font: ctx.font,
    color: MUTED,
  });
  const stamp = "RECEIPT";
  const stampW = ctx.bold.widthOfTextAtSize(stamp, 11);
  page.drawText(stamp, {
    x: RIGHT - stampW,
    y: PAGE_H - 64,
    size: 11,
    font: ctx.bold,
    color: ACCENT,
  });
  ctx.y = PAGE_H - 154;
}

function drawMeta(ctx: Ctx, paidLabel: string, status: string) {
  const columns = [
    { label: "CONFIRMATION", value: ctx.code, color: INK },
    { label: "DATE PAID", value: paidLabel, color: INK },
    { label: "STATUS", value: status, color: status === "Paid" ? GREEN : INK },
  ];
  const colW = CONTENT_W / 3;
  const top = ctx.y;
  columns.forEach((column, index) => {
    const x = MARGIN + index * colW;
    ctx.page.drawText(column.label, { x, y: top, size: 8, font: ctx.bold, color: MUTED });
    ctx.page.drawText(pdfText(ctx.bold, column.value), {
      x,
      y: top - 16,
      size: 12,
      font: ctx.bold,
      color: column.color,
    });
  });
  ctx.y = top - 40;
  rule(ctx);
  ctx.y -= 28;
}

function kicker(ctx: Ctx, label: string) {
  ensure(ctx, 18);
  ctx.page.drawText(label, { x: MARGIN, y: ctx.y, size: 8, font: ctx.bold, color: MUTED });
  ctx.y -= 18;
}

function drawBlock(ctx: Ctx, lines: string[], size: number, font: PDFFont, color: ReturnType<typeof rgb>) {
  const shown = lines.length ? lines : ["—"];
  const step = size + 4;
  ensure(ctx, shown.length * step);
  for (const line of shown) {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size, font, color });
    ctx.y -= step;
  }
}

function drawField(ctx: Ctx, label: string, value: string) {
  const labelW = 92;
  const lines = wrap(ctx.font, value, 11, CONTENT_W - labelW);
  const shown = lines.length ? lines : ["—"];
  const step = 15;
  ensure(ctx, shown.length * step);
  const top = ctx.y;
  ctx.page.drawText(label, { x: MARGIN, y: top, size: 11, font: ctx.font, color: MUTED });
  shown.forEach((line, index) => {
    ctx.page.drawText(line, {
      x: MARGIN + labelW,
      y: top - index * step,
      size: 11,
      font: ctx.font,
      color: INK,
    });
  });
  ctx.y = top - shown.length * step - 2;
}

type LineItem = { label: string; amount: string; total?: boolean };

function lineItems(data: BookingConfirmation): LineItem[] {
  const rows: LineItem[] = [
    { label: "Class price", amount: formatCents(data.classAmountCents) },
  ];
  for (const fee of data.passThroughFees) {
    rows.push({ label: fee.name || "Fee", amount: formatCents(fee.amountCents) });
  }
  rows.push({ label: PLATFORM_FEE_LINE_LABEL, amount: formatCents(data.serviceFeeCents) });
  rows.push({
    label: data.state === "unpaid" ? "Total (USD)" : "Total paid (USD)",
    amount: formatCents(data.totalAmountCents),
    total: true,
  });
  return rows;
}

function drawTable(ctx: Ctx, rows: LineItem[]) {
  ensure(ctx, 36);
  ctx.page.drawText("DESCRIPTION", { x: MARGIN, y: ctx.y, size: 8, font: ctx.bold, color: MUTED });
  const amountHeader = "AMOUNT";
  const headerW = ctx.bold.widthOfTextAtSize(amountHeader, 8);
  ctx.page.drawText(amountHeader, {
    x: RIGHT - headerW,
    y: ctx.y,
    size: 8,
    font: ctx.bold,
    color: MUTED,
  });
  ctx.y -= 10;
  rule(ctx);
  ctx.y -= 18;

  for (const row of rows) {
    const font = row.total ? ctx.bold : ctx.font;
    const size = row.total ? 12 : 11;
    const amount = pdfText(font, row.amount);
    const amountW = font.widthOfTextAtSize(amount, size);
    const lines = wrap(font, row.label, size, CONTENT_W - amountW - 18);
    const shown = lines.length ? lines : ["—"];
    const step = size + 3;
    const block = shown.length * step + (row.total ? 32 : 8);
    ensure(ctx, block);
    if (row.total) {
      ctx.y -= 4;
      rule(ctx);
      ctx.y -= 20;
    }
    const top = ctx.y;
    shown.forEach((line, index) => {
      ctx.page.drawText(line, { x: MARGIN, y: top - index * step, size, font, color: INK });
    });
    ctx.page.drawText(amount, { x: RIGHT - amountW, y: top, size, font, color: INK });
    ctx.y = top - shown.length * step - (row.total ? 2 : 6);
  }
}

function classSchedule(data: BookingConfirmation): { date: string; time: string } {
  const date = formatInTz(data.startsAt, data.timezone, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const start = formatInTz(data.startsAt, data.timezone, { hour: "numeric", minute: "2-digit" });
  if (!data.endsAt) {
    return {
      date,
      time: formatInTz(data.startsAt, data.timezone, {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }),
    };
  }
  const end = formatInTz(data.endsAt, data.timezone, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return { date, time: `${start} – ${end}` };
}

export function bookingReceiptFilename(data: Pick<BookingConfirmation, "confirmationCode">): string {
  const code = (data.confirmationCode ?? "").replace(/[^A-Za-z0-9-]+/g, "");
  return `CarryClass-receipt-${code || "booking"}.pdf`;
}

export async function buildBookingReceiptPdf(data: BookingConfirmation): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const code = pdfText(bold, data.confirmationCode?.trim() || "Pending") || "Pending";

  doc.setTitle(`CarryClass receipt ${code}`);
  doc.setAuthor("CarryClass");
  doc.setSubject("Booking payment receipt");
  doc.setCreator("CarryClass");

  const ctx: Ctx = {
    doc,
    page: doc.addPage([PAGE_W, PAGE_H]),
    font,
    bold,
    y: PAGE_H,
    code,
  };

  const paidLabel = data.paidAt
    ? formatInTz(data.paidAt, data.timezone, { month: "long", day: "numeric", year: "numeric" })
    : "Pending";
  const status =
    data.state === "confirmed" ? "Paid" : data.state === "pending" ? "Processing" : "Not charged";
  const schedule = classSchedule(data);
  const location =
    data.location?.trim() || `${data.vendorName} will send location details before class.`;

  drawHeader(ctx);
  drawMeta(ctx, paidLabel, status);

  kicker(ctx, "BILLED TO");
  drawBlock(ctx, wrap(bold, data.customerName.trim() || "—", 12, CONTENT_W), 12, bold, INK);
  if (data.customerEmail.trim()) {
    ctx.y -= 1;
    drawBlock(ctx, wrap(font, data.customerEmail, 11, CONTENT_W), 11, font, MUTED);
  }

  ctx.y -= 14;
  kicker(ctx, "CLASS");
  drawBlock(ctx, wrap(bold, data.classTitle, 13, CONTENT_W), 13, bold, INK);
  ctx.y -= 4;
  drawField(ctx, "Instructor", data.vendorName);
  drawField(ctx, "Date", schedule.date);
  drawField(ctx, "Time", schedule.time);
  drawField(ctx, "Location", location);

  ctx.y -= 10;
  ensure(ctx, 28);
  rule(ctx);
  ctx.y -= 22;
  drawTable(ctx, lineItems(data));

  const note =
    data.state === "confirmed"
      ? `Charged on ${paidLabel} in US dollars. The CarryClass transaction fee is non-refundable. The class price and any instructor fees are paid to the instructor.`
      : "The CarryClass transaction fee is non-refundable. The class price and any instructor fees are paid to the instructor.";
  const noteLines = wrap(font, note, 9, CONTENT_W);
  ensure(ctx, 12 + noteLines.length * 13);
  ctx.y -= 12;
  for (const line of noteLines) {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size: 9, font, color: MUTED });
    ctx.y -= 13;
  }

  if (ctx.y < FOOTER_CLEARANCE) {
    ctx.page = doc.addPage([PAGE_W, PAGE_H]);
    continuationHeader(ctx);
  }
  drawFooter(ctx);

  return doc.save();
}
