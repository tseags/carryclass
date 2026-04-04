import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isUserRole, STUDENT_ROLE, VENDOR_ROLE } from "@/lib/auth/roles";

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Only guard dashboard routes; all other pages remain public.
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (!userId) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(signInUrl);
  }

  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/sign-in", url.origin));
  }

  const role = user.publicMetadata.role;

  if (!isUserRole(role)) {
    // Let the onboarding flow set an initial role.
    return NextResponse.redirect(new URL("/onboarding", url.origin));
  }

  if (pathname.startsWith("/dashboard/student") && role !== STUDENT_ROLE) {
    return NextResponse.redirect(new URL("/dashboard/vendor", url.origin));
  }

  if (pathname.startsWith("/dashboard/vendor") && role !== VENDOR_ROLE) {
    return NextResponse.redirect(new URL("/dashboard/student", url.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

