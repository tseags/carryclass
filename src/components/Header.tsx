"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { VENDOR_ROLE } from "@/lib/auth/roles";

function DashboardMenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h3A1.5 1.5 0 0 1 8 3.5v1A1.5 1.5 0 0 1 6.5 6h-3A1.5 1.5 0 0 1 2 4.5v-1ZM2 10.5A1.5 1.5 0 0 1 3.5 9h3A1.5 1.5 0 0 1 8 10.5v1A1.5 1.5 0 0 1 6.5 13h-3A1.5 1.5 0 0 1 2 11.5v-1ZM9.5 2A1.5 1.5 0 0 0 8 3.5v9A1.5 1.5 0 0 0 9.5 14h3a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12.5 2h-3Z" />
    </svg>
  );
}

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useUser();
  const isInstructor = user?.publicMetadata?.role === VENDOR_ROLE;
  const onDashboard = pathname.startsWith("/dashboard");

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/ca", label: "Counties" },
    { href: "/for-instructors", label: "For Instructors" },
  ];

  return (
    <div
      role="banner"
      className="header-wrapper w-nav"
      data-animation="default"
      data-collapse="medium"
      data-duration="400"
      data-easing="ease"
    >
      <div className="container-default w-container">
        <div className="header-content-wrapper">
          <a
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`header-logo-link w-nav-brand ${pathname === "/" ? "w--current" : ""}`}
          >
            <Image
              src="/images/carryclass-logo.png"
              width={153}
              height={28}
              sizes="(max-width: 479px) 72vw, 153px"
              alt="CarryClass"
              priority
            />
          </a>
          <div className="header-right-side">
            <nav
              role="navigation"
              className="header-nav-menu-wrapper w-nav-menu"
              data-nav-menu-open={mobileMenuOpen ? "" : undefined}
            >
              <ul role="list" className="header-nav-menu-list">
                {navLinks.map(({ href, label }) => (
                  <li key={href} className="header-nav-list-item">
                    {href === "/" ? (
                      <a
                        href="/"
                        aria-current={pathname === "/" ? "page" : undefined}
                        className={`header-nav-link w-nav-link ${pathname === "/" ? "w--current" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        href={href}
                        aria-current={pathname === href ? "page" : undefined}
                        className={`header-nav-link w-nav-link ${pathname === href ? "w--current" : ""}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
                <li className="header-nav-list-item show-in-tablet">
                  <Link
                    href="/instructors"
                    className="btn-primary bg-secondary-2 small w-button"
                  >
                    Find Classes
                  </Link>
                </li>
                {isInstructor ? (
                  <li className="header-nav-list-item show-in-tablet">
                    <Link
                      href="/dashboard/vendor"
                      aria-current={onDashboard ? "page" : undefined}
                      className={`header-nav-link w-nav-link ${onDashboard ? "w--current" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Dashboard
                    </Link>
                  </li>
                ) : null}
                <li className="header-nav-list-item show-in-tablet">
                  {user ? (
                    <SignOutButton redirectUrl="/" signOutOptions={{}} >
                      <span
                        className="header-nav-link w-nav-link"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign out
                      </span>
                    </SignOutButton>
                  ) : (
                    <Link
                      href="/sign-in"
                      className="header-nav-link w-nav-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                  )}
                </li>
              </ul>
            </nav>
            <div className="header-btn-right-wrapper flex items-center justify-end gap-3">
              <Link href="/instructors" className="btn-primary bg-secondary-2 small w-button">
                Find Classes
              </Link>
              <div className="hidden ml-1 flex items-center gap-2 sm:flex">
                {user ? (
                  <>
                  {isInstructor ? (
                    <Link
                      href="/dashboard/vendor"
                      aria-current={onDashboard ? "page" : undefined}
                      className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      Dashboard
                    </Link>
                  ) : null}
                  <SignOutButton redirectUrl="/" signOutOptions={{}}>
                    <span className="text-sm font-medium text-zinc-700 hover:text-zinc-900">
                      Sign out
                    </span>
                  </SignOutButton>
                  <UserButton
                    appearance={{
                      elements: { avatarBox: "h-7 w-7" },
                    }}
                  >
                    {isInstructor && (
                      <UserButton.MenuItems>
                        <UserButton.Link
                          label="Dashboard"
                          href="/dashboard/vendor"
                          labelIcon={<DashboardMenuIcon />}
                        />
                      </UserButton.MenuItems>
                    )}
                  </UserButton>
                  </>
                ) : (
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </div>
            <button
              type="button"
              aria-label="Toggle menu"
              className={`hamburger-menu-wrapper w-nav-button ${mobileMenuOpen ? "w--open" : ""}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="hamburger-menu-bar top" />
              <div className="hamburger-menu-bar bottom" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
