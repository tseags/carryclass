/**
 * Gear page: hero + filterable product grid. Replace buyUrl with your affiliate links.
 */

export const GEAR_HERO = {
  title: "The best gear for CCW training & everyday carry",
  backgroundImage: "/images/gear-hero.png",
  objectPosition: "140% 55%",
};

export const GEAR_FILTER_CATEGORIES = [
  { slug: "all", label: "All" },
  { slug: "holsters", label: "Holsters" },
  { slug: "storage", label: "Storage" },
  { slug: "ammo-training", label: "Ammo & Training" },
  { slug: "belts", label: "Belts" },
  { slug: "ear-protection", label: "Ear Protection" },
  { slug: "eye-protection", label: "Eye Protection" },
] as const;

export interface GearProduct {
  id: string;
  name: string;
  brand?: string;
  shortDescription: string;
  imageUrl: string;
  price?: string;
  buyUrl: string;
  category: string;
  badge?: "Top Pick" | "Budget Pick";
  rating?: number;
  reviewCount?: number;
  categoryLabel?: string;
  /** Amazon ASIN for live price lookup (optional). Set env AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG. */
  amazonAsin?: string;
}

export const GEAR_PRODUCTS: GearProduct[] = [
  {
    id: "1",
    brand: "We The People",
    name: "IWB Holster",
    shortDescription: "American-made Kydex IWB holster with secure belt clip. Fits most popular carry guns.",
    imageUrl: "/images/gear/we-the-people-holster.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=we+the+people+holster",
    category: "holsters",
    badge: "Top Pick",
    rating: 4.8,
    reviewCount: 234,
    categoryLabel: "Holsters",
    amazonAsin: "B07D1G2C1K",
  },
  {
    id: "2",
    brand: "Stop Box",
    name: "Portable Gun Safe (2 Pack)",
    shortDescription: "Quick-access portable handgun safe with combination lock. Foam-lined, travel-ready.",
    imageUrl: "/images/gear/stop-box.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=stop+box+gun+safe",
    category: "storage",
    rating: 4.7,
    reviewCount: 189,
    categoryLabel: "Storage",
    amazonAsin: "B01N2RORU2",
  },
  {
    id: "3",
    brand: "Snap Caps",
    name: "Dummy Rounds (10 Pack)",
    shortDescription: "Training snap caps for dry fire and malfunction drills. Orange tip, metal casing.",
    imageUrl: "/images/gear/snap-caps.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=snap+caps+9mm",
    category: "ammo-training",
    badge: "Budget Pick",
    rating: 4.5,
    reviewCount: 412,
    categoryLabel: "Ammo & Training",
    amazonAsin: "B0002KLZR8",
  },
  {
    id: "4",
    brand: "5.11 Tactical",
    name: "TDU Belt",
    shortDescription: "Stiff nylon duty belt with quick-release buckle. Built for holsters and EDC.",
    imageUrl: "/images/gear/511-belt.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=5.11+tactical+belt",
    category: "belts",
    badge: "Top Pick",
    rating: 4.8,
    reviewCount: 167,
    categoryLabel: "Belts",
    amazonAsin: "B001KZ3Q2E",
  },
  {
    id: "5",
    brand: "Walker's",
    name: "Razor Electronic Earmuffs",
    shortDescription: "Electronic hearing protection with sound amplification. NRR 23 dB, compact fold.",
    imageUrl: "/images/gear/walkers-earmuffs.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=walkers+razor+ear+muffs",
    category: "ear-protection",
    rating: 4.9,
    reviewCount: 891,
    categoryLabel: "Ear Protection",
    amazonAsin: "B001T7QJ9O",
  },
  {
    id: "6",
    brand: "Xaegistac",
    name: "Shooting Glasses with Case",
    shortDescription:
      "Anti-fog hunting safety glasses with protective case. ANSI Z87.1 eye protection for adults at the range.",
    imageUrl: "/images/gear/safety-glasses.png",
    price: "Check price",
    buyUrl:
      "https://www.amazon.com/s?k=Xaegistac+Shooting+Glasses+with+Case+Anti+Fog+Hunting+Safety+Glasses+for+Adults",
    category: "eye-protection",
    badge: "Top Pick",
    rating: 4.7,
    reviewCount: 304,
    categoryLabel: "Eye Protection",
  },
  {
    id: "7",
    brand: "Vedder",
    name: "OWB LightTuck Holster",
    shortDescription: "Kydex OWB holster for range and open carry. Adjustable retention, fits 1.5\" belts.",
    imageUrl: "/images/gear/owb-holster.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=vedder+owb+holster",
    category: "holsters",
    rating: 4.6,
    reviewCount: 98,
    categoryLabel: "Holsters",
  },
  {
    id: "8",
    brand: "Caldwell",
    name: "Paper Targets (100 Pack)",
    shortDescription: "Bullseye and silhouette paper targets for range practice. Standard sizes, easy to hang.",
    imageUrl: "/images/gear/paper-targets.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=caldwell+paper+targets+shooting",
    category: "ammo-training",
    badge: "Budget Pick",
    rating: 4.4,
    reviewCount: 213,
    categoryLabel: "Ammo & Training",
  },
  {
    id: "9",
    brand: "Blue Force Gear",
    name: "Double Mag Pouch",
    shortDescription: "Belt-mounted double magazine pouch for range and training. Fits 9mm and similar.",
    imageUrl: "/images/gear/mag-pouch.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=double+mag+pouch+belt",
    category: "ammo-training",
    rating: 4.5,
    reviewCount: 76,
    categoryLabel: "Ammo & Training",
  },
  {
    id: "10",
    brand: "Savior Equipment",
    name: "Range Bag",
    shortDescription: "Multi-compartment range bag for handgun, mags, ears, eyes, and ammo. Durable, carry-handle.",
    imageUrl: "/images/gear/range-bag.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=range+bag+handgun",
    category: "storage",
    rating: 4.6,
    reviewCount: 245,
    categoryLabel: "Storage",
  },
  {
    id: "11",
    brand: "Hoppe's",
    name: "Universal Cleaning Kit",
    shortDescription: "Bore brush, patches, rod, and solvent for handgun cleaning. Fits common calibers.",
    imageUrl: "/images/gear/cleaning-kit.png",
    price: "Check price",
    buyUrl: "https://www.amazon.com/s?k=hoppes+handgun+cleaning+kit",
    category: "ammo-training",
    rating: 4.7,
    reviewCount: 321,
    categoryLabel: "Ammo & Training",
  },
  {
    id: "12",
    brand: "Condition 1",
    name:
      "18\" 5 Pistol Case, Model 801",
    shortDescription:
      "Heavy-duty waterproof hard gun case with pre-cut foam for 5 pistols and 20 magazines. TSA-friendly and made in USA.",
    imageUrl: "/images/gear/pistol-case.png",
    price: "Check price",
    buyUrl:
      "https://www.amazon.com/s?k=Condition+1+18+5+Pistol+Case+Model+801+Heavy+Duty+Waterproof+Hard+Gun+Case",
    category: "storage",
    rating: 4.8,
    reviewCount: 104,
    categoryLabel: "Storage",
  },
];
