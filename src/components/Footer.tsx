import Link from "next/link";

type FooterLink = { label: string; href: string };

const DIRECTORY_LINKS: FooterLink[] = [
  { label: "Find classes", href: "/instructors" },
  { label: "Browse counties", href: "/ca" },
];

const STUDENT_LINKS: FooterLink[] = [
  { label: "Initial classes", href: "/instructors?classType=initial" },
  { label: "Renewal classes", href: "/instructors?classType=renewal" },
  { label: "Virtual options", href: "/instructors?format=online" },
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
              aria-label="CarryClass home"
              className="inline-flex items-baseline text-[32px] font-extrabold leading-none tracking-[-0.02em]"
            >
              <span className="text-[#f2f0e8]">Carry</span>
              <span className="text-[#d56f49]">Class</span>
            </Link>
            <p className="site-footer__tagline mt-10 max-w-[260px] text-sm leading-[1.7] text-[#b0aea5]">
              California&apos;s most complete directory of sheriff-approved CCW
              training classes and instructors.
            </p>
          </div>

          <div className="site-footer__columns grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-2">
            <FooterColumn title="Directory" links={DIRECTORY_LINKS} />
            <FooterColumn title="For students" links={STUDENT_LINKS} />
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-[#30302e] pt-6 text-[13px] text-[#87867f] sm:flex-row sm:flex-wrap sm:items-center">
          <p>&copy; 2026 CCW Directory. All rights reserved.</p>
          <nav className="flex items-center gap-6">
            <Link href="/privacy" className="site-footer__link">
              Privacy
            </Link>
            <Link href="/terms" className="site-footer__link">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
