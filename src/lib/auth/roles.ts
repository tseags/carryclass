export type UserRole = "student" | "vendor";

export const STUDENT_ROLE: UserRole = "student";
export const VENDOR_ROLE: UserRole = "vendor";

export function isUserRole(value: unknown): value is UserRole {
  return value === "student" || value === "vendor";
}

