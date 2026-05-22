/**
 * True when Prisma cannot open a connection to the database (down, paused, bad URL, network).
 * Used to degrade gracefully on listing pages instead of returning 500.
 */
export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: unknown; code?: unknown; message?: unknown };
  if (e.code === "P1001" || e.code === "P1017") return true;
  if (e.name === "PrismaClientInitializationError") return true;
  if (typeof e.message === "string" && e.message.includes("Can't reach database server")) return true;
  return false;
}
