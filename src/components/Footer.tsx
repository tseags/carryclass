import Link from "next/link";

type FooterLink = { label: string; href: string };

const DIRECTORY_LINKS: FooterLink[] = [
  { label: "Find courses", href: "/vendors" },
  { label: "Browse counties", href: "/ca" },
  { label: "Gear", href: "/gear" },
  { label: "About", href: "/about" },
];

const STUDENT_LINKS: FooterLink[] = [
  { label: "Initial courses", href: "/vendors" },
  { label: "Renewal courses", href: "/vendors" },
  { label: "Virtual options", href: "/vendors" },
  { label: "FAQs", href: "/faqs" },
];

const INSTRUCTOR_LINKS: FooterLink[] = [
  { label: "List your course", href: "/vendors/claim" },
  { label: "Update listing", href: "/dashboard/vendor" },
  { label: "Sign in", href: "/sign-in" },
  { label: "Sign up", href: "/sign-up" },
];

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div className="site-footer__column text-left">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.5px] text-[#b0aea5]">
        {title}
      </div>
      <ul className="site-footer__column-list space-y-[10px]">
        {links.map(({ label, href }) => (
          <li key={`${title}-${label}`}>
            <Link
              href={href}
              className="site-footer__link text-sm leading-none"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="site-footer border-t border-[#30302e] bg-[#141413] px-6 pb-10 pt-16">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-[2fr_3fr]">
          <div className="md:pr-6">
            <Link
              href="/"
              aria-label="CCW Directory"
              className="site-footer__wordmark inline-flex items-baseline font-serif text-[26px] leading-none tracking-[-0.01em]"
            >
              <span className="font-medium">CCW</span>
              <span className="site-footer__wordmark-accent ml-[0.35em] font-normal">
                Directory
              </span>
            </Link>
            <p className="site-footer__tagline mt-10 max-w-[260px] text-sm leading-[1.7] text-[#b0aea5]">
              California&apos;s most complete directory of sheriff-approved CCW
              training courses and instructors.
            </p>
          </div>

          <div className="site-footer__columns grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-3">
            <FooterColumn title="Directory" links={DIRECTORY_LINKS} />
            <FooterColumn title="For students" links={STUDENT_LINKS} />
            <FooterColumn title="Instructors" links={INSTRUCTOR_LINKS} />
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-[#30302e] pt-6 text-[13px] text-[#87867f] sm:flex-row sm:flex-wrap sm:items-center">
          <p>&copy; 2026 CCW Directory. All rights reserved.</p>
          <nav className="flex items-center gap-6">
            <Link href="/terms-conditions" className="site-footer__link">
              Privacy
            </Link>
            <Link href="/terms-conditions" className="site-footer__link">
              Terms
            </Link>
            <Link href="/terms-conditions" className="site-footer__link">
              Accessibility
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
