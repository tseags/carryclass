import Image from "next/image";
import Link from "next/link";

type Article = {
  slug: string;
  category: string;
  title: string;
  description: string;
  image: string;
};

const ARTICLES: Article[] = [
  {
    slug: "how-to-apply-ccw-california",
    category: "Process",
    title: "How to Apply for Your CCW Permit in California",
    description:
      "Step-by-step guide to the application process, required documents, and what to expect at your interview.",
    image:
      "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=600&q=80",
  },
  {
    slug: "initial-vs-renewal-classes",
    category: "Training",
    title: "Initial vs. Renewal CCW Classes: What's the Difference?",
    description:
      "Understand the 16-hour initial requirement and 8-hour renewal course options across California counties.",
    image:
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80",
  },
  {
    slug: "best-ccw-gear-beginners",
    category: "Gear",
    title: "Best CCW Gear for Beginners",
    description:
      "Holsters, belts, and everyday carry essentials recommended by instructors and experienced permit holders.",
    image:
      "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&q=80",
  },
];

export function HomeArticles() {
  return (
    <section className="home-articles" aria-labelledby="home-articles-heading">
      <div className="container-default w-container">
        <div className="home-articles__header">
          <h2 id="home-articles-heading" className="home-articles__heading">
            Browse CCW articles &amp; guides
          </h2>
          <Link
            href="/blog"
            className="btn-secondary w-button popular-vendors-redesign__view-all"
          >
            Browse all articles
          </Link>
        </div>
        <div className="home-articles__grid">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/blog#${article.slug}`}
              className="home-articles__card"
            >
              <div className="home-articles__card-banner">
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  sizes="(max-width: 991px) 100vw, 33vw"
                  className="home-articles__card-image"
                />
                <span className="home-articles__category">{article.category}</span>
              </div>
              <div className="home-articles__card-body">
                <h3 className="home-articles__card-title">{article.title}</h3>
                <p className="home-articles__card-copy">{article.description}</p>
                <span className="home-articles__read-more">
                  Read now <span className="home-articles__arrow">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
