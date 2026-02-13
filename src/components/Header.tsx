"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/gear", label: "Gear" },
    { href: "/ca", label: "Counties" },
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
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`logo-link w-nav-brand ${pathname === "/" ? "w--current" : ""}`}
          >
            <img
              src="/images/Screen-Shot-2025-10-19-at-4.28.10-PM.png"
              loading="lazy"
              width={223}
              sizes="(max-width: 479px) 93vw, 223px"
              alt="CCW Courses"
            />
          </Link>
          <div className="header-right-side">
            <nav
              role="navigation"
              className="header-nav-menu-wrapper w-nav-menu"
              data-nav-menu-open={mobileMenuOpen ? "" : undefined}
            >
              <ul role="list" className="header-nav-menu-list">
                {navLinks.map(({ href, label }) => (
                  <li key={href} className="header-nav-list-item">
                    <Link
                      href={href}
                      aria-current={pathname === href ? "page" : undefined}
                      className={`header-nav-link w-nav-link ${pathname === href ? "w--current" : ""}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
                <li className="header-nav-list-item show-in-tablet">
                  <Link
                    href="/vendors"
                    className="btn-primary bg-secondary-2 small w-button"
                  >
                    Find CCW Courses
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="header-btn-right-wrapper">
              <Link href="/vendors" className="btn-primary bg-secondary-2 small w-button">
                Find CCW Courses
              </Link>
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
