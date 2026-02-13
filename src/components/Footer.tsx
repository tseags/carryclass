import Link from "next/link";
import Image from "next/image";
import { getCountyDisplayName } from "@/data/counties";

const FEATURED_COUNTIES = [
  { slug: "los-angeles", image: "los-angeles.png" },
  { slug: "san-diego", image: "San-Diego---2.png" },
  { slug: "orange", image: "Orange-County.png" },
  { slug: "riverside", image: "riverside.png" },
  { slug: "san-bernardino", image: "san-bernardino.jpg" },
  { slug: "sacramento", image: "sacramento-2.jpg" },
] as const;

export function Footer() {
  return (
    <div>
      <div className="container-default w-container">
        <div className="footer-inner-wrapper">
          <div className="inner-container _1122px center">
            <div className="grid-4-columns footer-pages-grid">
              <div>
                <div className="text-300 footer-column-title">Pages</div>
                <div className="grid-3-columns footer-main-pages-grid">
                  <ul role="list" className="footer-list-wrapper">
                    <li className="footer-list-item">
                      <Link href="/" className="footer-link">
                        Home
                      </Link>
                    </li>
                    <li className="footer-list-item">
                      <Link href="/vendors" className="footer-link">
                        All Vendors
                      </Link>
                    </li>
                    <li className="footer-list-item">
                      <Link href="/ca" className="footer-link">
                        Counties
                      </Link>
                    </li>
                    <li className="footer-list-item">
                      <Link href="/about" className="footer-link">
                        About
                      </Link>
                    </li>
                    <li className="footer-list-item">
                      <Link href="/faqs" className="footer-link">
                        FAQs
                      </Link>
                    </li>
                    <li className="footer-list-item mg-bottom-0">
                      <Link href="/vendors" className="footer-link">
                        For Vendors
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div>
                <div className="text-300 footer-column-title">Resources</div>
                <ul role="list" className="footer-list-wrapper">
                  <li className="footer-list-item">
                    <Link href="/blog" className="footer-link">
                      Blog
                    </Link>
                  </li>
                  <li className="footer-list-item">
                    <Link href="/gear" className="footer-link">
                      Gear
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <div className="text-300 footer-column-title">
                  Featured Counties | <Link href="/ca">View all</Link>
                </div>
                <div className="grid-1-column gap-row-16px">
                  {FEATURED_COUNTIES.slice(0, 3).map(({ slug, image }) => (
                    <Link
                      key={slug}
                      href={`/ca/${slug}`}
                      className="footer-link---image-left w-inline-block"
                    >
                      <div className="link-item---image-wrapper border-radius-6px">
                        <img
                          src={`/images/${image}`}
                          loading="lazy"
                          alt=""
                          className="link-item---image"
                        />
                      </div>
                      <div className="grid-1-column gap-row-6px">
                        <div className="link-item-text---hover-secondary-2 text-200 bold">
                          {getCountyDisplayName(slug)} County
                        </div>
                        <div className="text-200 color-neutral-600">
                          View CCW Classes
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
              <div>
                <div className="grid-1-column gap-row-16px">
                  {FEATURED_COUNTIES.slice(3, 6).map(({ slug, image }) => (
                    <Link
                      key={slug}
                      href={`/ca/${slug}`}
                      className="footer-link---image-left w-inline-block"
                    >
                      <div className="link-item---image-wrapper border-radius-6px">
                        <img
                          src={`/images/${image}`}
                          loading="lazy"
                          alt=""
                          className="link-item---image"
                        />
                      </div>
                      <div className="grid-1-column gap-row-6px">
                        <div className="link-item-text---hover-secondary-2 text-200 bold">
                          {getCountyDisplayName(slug)} County
                        </div>
                        <div className="text-200 color-neutral-600">
                          View CCW Classes
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="grid-2-columns footer---logo-and-text-grid">
            <div>
              <Link href="/" className="logo-link w-nav-brand">
                <img
                  src="/images/CCW-Logo---Transparent.png"
                  loading="lazy"
                  width={223}
                  sizes="(max-width: 479px) 93vw, 223px"
                  alt="CCW Courses"
                />
              </Link>
            </div>
            <div className="color-neutral-800">
              © 2025 ccwclassesca.com · All rights reserved ·{" "}
              <Link href="/terms-conditions">Terms & Conditions</Link> ·{" "}
              <Link href="/terms-conditions">Privacy Policy</Link> ·{" "}
              <Link href="/terms-conditions">User Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
