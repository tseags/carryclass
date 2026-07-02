import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import clerkConfig from "../../clerk.config";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd } from "@/lib/json-ld";
import {
  DEFAULT_OG_IMAGE_PATH,
  DEFAULT_SITE_DESCRIPTION,
  buildOpenGraph,
  buildTwitter,
} from "@/lib/seo";
import { Analytics } from "@vercel/analytics/react";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { SITE_URL } from "@/lib/site-url";

const defaultTitle = "CarryClass | Find CCW Classes & Instructors Near Me";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: defaultTitle,
    template: "%s | CarryClass",
  },
  description: DEFAULT_SITE_DESCRIPTION,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
  openGraph: {
    ...buildOpenGraph({
      title: defaultTitle,
      description: DEFAULT_SITE_DESCRIPTION,
    }),
    images: [
      {
        url: DEFAULT_OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "CarryClass — California CCW classes directory",
      },
    ],
  },
  twitter: buildTwitter({
    title: defaultTitle,
    description: DEFAULT_SITE_DESCRIPTION,
  }),
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
      {...clerkConfig}
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
          <link rel="icon" href="/favicon.ico" />
          <link href="/css/normalize.css" rel="stylesheet" />
          <link href="/css/webflow.css" rel="stylesheet" />
          <link href="/css/ccw-directory.webflow.css" rel="stylesheet" />
          {/* After Webflow — local overrides always win */}
          <link href="/css/app-overrides.css" rel="stylesheet" />
        </head>
        <body className="min-h-screen antialiased">
          <GoogleAnalytics />
          <Analytics />
          <JsonLd data={organizationJsonLd()} />
          <ToastProvider>
            <div className="page-wrapper">{children}</div>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
