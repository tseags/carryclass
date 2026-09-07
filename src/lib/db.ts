import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Supabase's transaction pooler (:6543) is pgBouncer in transaction mode, where
 * a connection is handed to a different backend between statements. Prisma's
 * prepared statements then collide and raw queries intermittently fail with
 * 42P05 "prepared statement s0 already exists" — measured at roughly 1 in 12
 * runs, which would surface as random 500s on the claim start/verify routes.
 *
 * `pgbouncer=true` tells Prisma to stop using prepared statements. This is
 * applied here rather than in the env var so it cannot be lost when a deploy
 * environment is configured by hand. Direct/session connections (:5432) are
 * left untouched, and the Prisma CLI still reads the raw env var, which is what
 * DDL wants.
 */
export function poolSafeDatabaseUrl(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return raw;
  const url = raw.trim();
  if (!/pooler\.supabase\.com:6543/.test(url)) return url;
  if (/[?&]pgbouncer=true\b/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "pgbouncer=true";
}

const datasourceUrl = poolSafeDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
