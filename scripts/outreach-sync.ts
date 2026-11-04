/**
 * Refresh /outreach contacts from carry_class_vendor_data (read only) and print tag counts.
 * Keeps every contact's stage, next action, notes, and call/email history.
 *
 * Usage: npm run outreach:sync
 */

import { config } from "dotenv";
import { resolve } from "node:path";

for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  config({ path: resolve(process.cwd(), file), override: true, quiet: true });
}

async function main() {
  const { syncOutreachContacts } = await import("../src/lib/outreach/sync");
  const { prisma } = await import("../src/lib/db");
  const report = await syncOutreachContacts();
  console.log(`Listing rows read:        ${report.sourceRows}`);
  console.log(`Deduped CA instructors:   ${report.contacts}`);
  console.log(`Created / updated:        ${report.created} / ${report.updated}`);
  console.log("Tag counts:");
  for (const [tag, n] of Object.entries(report.tagCounts)) {
    console.log(`  ${tag.padEnd(22)} ${n}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
