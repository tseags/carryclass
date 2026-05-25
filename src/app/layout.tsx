import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "CarryClass | Find CCW Classes & Instructors Near Me",
    template: "%s | CarryClass",
  },
  description:
    "Find sheriff-approved CCW classes and certified instructors in California. Browse by county, compare prices, and get your permit.",
};

// Explicit viewport declaration so mobile Safari uses the device width
// (Next.js injects a sensible default, but we set it here for forward-compat
// and to keep `maximumScale` configurable in one place).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        options: {
          unsafe_disableDevelopmentModeWarnings: true,
        },
      }}
    >
      <html
        lang="en"
        data-ccw-dev={process.env.NODE_ENV === "development" ? "true" : undefined}
      >
        <head>
          <link href="/css/normalize.css" rel="stylesheet" />
          <link href="/css/webflow.css" rel="stylesheet" />
          <link href="/css/ccw-directory.webflow.css" rel="stylesheet" />
          {/* After Webflow — local overrides always win */}
          <link href="/css/app-overrides.css" rel="stylesheet" />
        </head>
        <body className="min-h-screen antialiased">
          <ToastProvider>
            <div className="page-wrapper">{children}</div>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
