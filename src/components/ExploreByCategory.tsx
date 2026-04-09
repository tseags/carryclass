import Link from "next/link";
import Image from "next/image";

const CATEGORIES = [
  {
    label: "16-Hour Initial",
    href: "/vendors?category=initial",
    icon: "/icons/target.png",
  },
  {
    label: "8-Hour Renewal",
    href: "/vendors?category=renewal",
    icon: "/icons/renewal.png",
  },
  {
    label: "Add a Gun",
    href: "/vendors?category=add-gun",
    icon: "/icons/add.png",
  },
  {
    label: "Virtual Courses",
    href: "/vendors?category=online",
    icon: "/icons/virtual.png",
  },
];

export function ExploreByCategory() {
  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold text-zinc-900">
        Explore by category
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-orange-100 to-rose-100">
              <Image
                src={cat.icon}
                alt=""
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span className="font-medium text-zinc-900">{cat.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
