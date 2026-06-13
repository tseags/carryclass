import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isUserRole, STUDENT_ROLE, VENDOR_ROLE } from "@/lib/auth/roles";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isOnboardRoute = createRouteMatcher(["/onboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isDashboardRoute(req) && !isOnboardRoute(req)) {
    return NextResponse.next();
  }

  const { userId, redirectToSignIn, sessionClaims } = await auth();
  if (!userId) {
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // /onboard routes only require authentication, not a specific role
  if (isOnboardRoute(req)) {
    return NextResponse.next();
  }

  const role = (sessionClaims?.metadata as { role?: unknown } | undefined)?.role;
  if (!isUserRole(role)) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/dashboard/student") && role !== STUDENT_ROLE) {
    return NextResponse.redirect(new URL("/dashboard/vendor", req.url));
  }
  if (pathname.startsWith("/dashboard/vendor") && role !== VENDOR_ROLE) {
    return NextResponse.redirect(new URL("/dashboard/student", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)",
    "/(api|trpc)(.*)",
  ],
};
