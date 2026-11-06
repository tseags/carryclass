/** CRM pages and APIs are reachable only from this machine, never the public site. */

export function isLoopbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const bare = host.trim().toLowerCase();
  const hostname = bare.startsWith("[")
    ? bare.slice(1, bare.indexOf("]"))
    : bare.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function outreachSurfaceAllowed(host: string | null | undefined): boolean {
  if (process.env.VERCEL) return false;
  return isLoopbackHost(host);
}
