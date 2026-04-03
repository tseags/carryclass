import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GearProductGrid } from "@/components/gear/GearProductGrid";
import { GearHeroClient } from "@/components/gear/GearHeroClient";
import { GEAR_PRODUCTS, GEAR_FILTER_CATEGORIES } from "@/data/gear-page";

export const metadata = {
  title: "Gear | CCW Courses",
  description:
    "Find the best holsters, belts, PPE, safes, and more for CCW training and everyday carry.",
};

export default function GearPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <GearHeroClient />

      <main className="border-t border-zinc-200 bg-zinc-50/30">
        <GearProductGrid
          products={GEAR_PRODUCTS}
          filterCategories={[...GEAR_FILTER_CATEGORIES]}
        />
      </main>
      <Footer />
    </div>
  );
}
