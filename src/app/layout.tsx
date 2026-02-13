import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CCW Courses | Find CCW Classes & Instructors",
    template: "%s | CCW Courses",
  },
  description:
    "Find CCW (Concealed Carry Weapon) training classes and certified instructors. Browse by county, compare prices, and get your permit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="/css/normalize.css" rel="stylesheet" />
        <link href="/css/webflow.css" rel="stylesheet" />
        <link href="/css/ccw-directory.webflow.css" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <div className="page-wrapper">{children}</div>
      </body>
    </html>
  );
}
