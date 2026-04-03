import Link from "next/link";

/**
 * Standalone gear CTA section. Uses .gear-cta-section only (no Webflow .cta-section.old)
 * so layout is fully under our control: text and image sit high with consistent padding.
 */
export function GearCtaSection() {
  return (
    <section className="gear-cta-section" aria-labelledby="gear-cta-heading">
      <div className="gear-cta-section__inner">
        <div className="gear-cta-section__row">
          <div className="gear-cta-section__copy">
            <h2 id="gear-cta-heading" className="display-2 color-neutral-100 mg-bottom-12px">
              Find the Best Gear for CCW Training &amp; Everyday Carry
            </h2>
            <p className="paragraph-small color-neutral-300 mg-bottom-24px">
              View the best holsters, belts, PPE, safes, and more — trusted by CCW
              holders across California.
            </p>
            <Link href="/gear" className="btn-primary button-row gear-button w-button">
              View Gear
            </Link>
          </div>
          <div className="gear-cta-section__image-wrap">
            <img
              src="/images/gear-ccw-training.png"
              loading="lazy"
              alt="CCW training and everyday carry"
              className="gear-cta-section__image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
