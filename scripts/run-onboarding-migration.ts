import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

async function main() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), "migrations/onboarding.sql"),
    "utf-8"
  );

  // Split on semicolons but keep DO $$ blocks intact
  const statements: string[] = [];
  let current = "";
  let inDollarBlock = false;

  for (const line of sql.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") {
      current += line + "\n";
      continue;
    }
    if (trimmed.includes("$$")) {
      const count = (line.match(/\$\$/g) || []).length;
      if (count % 2 === 1) inDollarBlock = !inDollarBlock;
    }
    current += line + "\n";
    if (!inDollarBlock && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt && !stmt.startsWith("--")) {
        statements.push(stmt);
      }
      current = "";
    }
  }
  if (current.trim()) statements.push(current.trim());

  console.log(`Running ${statements.length} SQL statements...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.replace(/\s/g, "") === "") continue;
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`✓ Statement ${i + 1}/${statements.length}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Ignore "already exists" errors
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
      } else {
        console.error(`✗ Statement ${i + 1} failed:`, msg);
        console.error("SQL:", stmt.slice(0, 200));
      }
    }
  }

  console.log("\nMigration complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
