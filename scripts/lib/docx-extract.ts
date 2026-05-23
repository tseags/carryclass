import { readFile } from "node:fs/promises";
import JSZip from "jszip";

/**
 * Minimal docx -> paragraph extractor (no mammoth dependency).
 *
 * Reads the `word/document.xml` part of a .docx archive and walks `<w:p>`
 * paragraphs, capturing their concatenated text and the size (in half-points)
 * of any run inside. We rely on font size to identify section titles in the
 * CCW Timelines doc: titles use sz=45/46 (≈22.5pt) while body uses sz=20/21.
 */

export type DocxParagraph = {
  text: string;
  /** Largest w:sz value found among the runs (half-points). */
  sz: number;
  bold: boolean;
};

const PARA_RE = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
const SZ_RE = /<w:sz\s+w:val="(\d+)"\s*\/?>/g;
const TEXT_RE = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
const BOLD_RE = /<w:b\b(?!o)/; // matches <w:b ...> but not <w:bookmarkStart>
const BR_RE = /<w:br\b[^>]*\/?>/g;

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

export function parseDocumentXml(xml: string): DocxParagraph[] {
  const out: DocxParagraph[] = [];
  let p: RegExpExecArray | null;
  while ((p = PARA_RE.exec(xml)) !== null) {
    const inner = p[1];

    let maxSz = 0;
    let szMatch: RegExpExecArray | null;
    SZ_RE.lastIndex = 0;
    while ((szMatch = SZ_RE.exec(inner)) !== null) {
      const n = Number.parseInt(szMatch[1], 10);
      if (Number.isFinite(n) && n > maxSz) maxSz = n;
    }

    const bold = BOLD_RE.test(inner);

    // Replace <w:br/> with a newline before pulling text.
    const innerWithBreaks = inner.replace(BR_RE, "\n");
    let text = "";
    let tMatch: RegExpExecArray | null;
    TEXT_RE.lastIndex = 0;
    while ((tMatch = TEXT_RE.exec(innerWithBreaks)) !== null) {
      text += decodeXmlEntities(tMatch[1]);
    }
    out.push({ text, sz: maxSz, bold });
  }
  return out;
}

export async function extractDocxParagraphs(filePath: string): Promise<DocxParagraph[]> {
  const data = await readFile(filePath);
  const zip = await JSZip.loadAsync(data);
  const doc = zip.file("word/document.xml");
  if (!doc) {
    throw new Error(`No word/document.xml inside ${filePath}`);
  }
  const xml = await doc.async("string");
  return parseDocumentXml(xml);
}

export type DocxReport = {
  title: string;
  body: string;
  bodyParagraphs: string[];
};

/**
 * Segment paragraphs into individual timeline reports. A new report starts on
 * any non-empty paragraph whose largest font size meets `titleSzThreshold`
 * (default 30 half-points / 15pt). All subsequent paragraphs until the next
 * title (skipping blank paragraphs) belong to that report.
 */
export function segmentReports(
  paragraphs: DocxParagraph[],
  options: { titleSzThreshold?: number } = {}
): DocxReport[] {
  const threshold = options.titleSzThreshold ?? 30;
  const reports: DocxReport[] = [];
  let current: DocxReport | null = null;

  for (const p of paragraphs) {
    const text = p.text.replace(/\s+/g, " ").trim();
    const isTitleStyle = p.sz >= threshold;

    if (isTitleStyle && text.length > 0) {
      if (current) reports.push(current);
      current = { title: text, body: "", bodyParagraphs: [] };
      continue;
    }

    if (!current) continue; // leading body before any title — ignore

    if (text.length === 0) continue;
    current.bodyParagraphs.push(p.text.trim());
  }

  if (current) reports.push(current);

  for (const r of reports) {
    r.body = r.bodyParagraphs.join("\n\n");
  }

  return reports;
}
