import { clerkClient, type User } from "@clerk/nextjs/server";
import { VENDOR_ROLE } from "@/lib/auth/roles";

/** Set Clerk publicMetadata.role to vendor when missing or stale. */
export async function ensureVendorRole(
  userId: string,
  user: User | null | undefined
): Promise<void> {
  if (user?.publicMetadata?.role === VENDOR_ROLE) return;
  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: { ...user?.publicMetadata, role: VENDOR_ROLE },
  });
}
