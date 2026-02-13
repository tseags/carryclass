import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Gear | CCW Courses",
  description: "Find the best holsters, belts, PPE, safes, and more for CCW training and everyday carry.",
};

export default function GearPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main
        className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16"
        style={{ backgroundColor: "#1C2331" }}
      >
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          Gear Coming Soon
        </h1>
        <p className="mt-4 max-w-md text-center text-zinc-300">
          View the best holsters, belts, PPE, safes, and more — trusted by CCW
          holders across California.
        </p>
      </main>
      <Footer />
    </div>
  );
}
