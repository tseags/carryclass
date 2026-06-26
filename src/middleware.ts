import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
/** `/onboard` and subpaths only — must not match `/onboarding` */
const isOnboardRoute = createRouteMatcher(["/onboard", "/onboard/(.*)"]);

function isVendorOnboardingPath(pathname: string): boolean {
  return (
    pathname === "/onboard" ||
    pathname.startsWith("/onboard/") ||
    pathname.startsWith("/dashboard/vendor") ||
    pathname.startsWith("/onboarding/vendor")
  );
}

export default clerkMiddleware(async (auth, req) => {
  if (!isDashboardRoute(req) && !isOnboardRoute(req)) {
    return NextResponse.next();
  }

  const { userId } = await auth();
  if (!userId) {
    // Keep sign-in on the app origin (embedded /sign-in). redirectToSignIn() sends
    // users to accounts.getcarryclass.com, which breaks sessions on localhost.
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set(
      "redirect_url",
      `${req.nextUrl.pathname}${req.nextUrl.search}`
    );
    if (isVendorOnboardingPath(req.nextUrl.pathname)) {
      signIn.searchParams.set("intent", "vendor");
    }
    return NextResponse.redirect(signIn);
  }

  // Auth only — role checks use currentUser() in page components (session JWT can lag metadata updates).
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)",
    "/(api|trpc)(.*)",
  ],
};
