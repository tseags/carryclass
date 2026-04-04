/**
 * Shared content for gear page templates.
 */

export const GEAR_CATEGORIES = [
  {
    slug: "holsters",
    label: "Holsters",
    shortDescription: "IWB, OWB, and appendix options that fit your gun and body.",
    icon: "holster",
  },
  {
    slug: "belts",
    label: "Belts",
    shortDescription: "Stiff gun belts that support holster and spare mag.",
    icon: "belt",
  },
  {
    slug: "eye-ear-protection",
    label: "Eye & Ear Protection",
    shortDescription: "Safety glasses and electronic muffs for the range.",
    icon: "safety-glasses",
  },
  {
    slug: "ammo-range",
    label: "Ammo & Range",
    shortDescription: "100 rounds for class (+50 per extra gun), snap caps, and storage.",
    icon: "bullet",
  },
  {
    slug: "magazines",
    label: "Magazines & Carriers",
    shortDescription: "Spare mags and carriers for training and EDC.",
    icon: "magazine",
  },
  {
    slug: "storage-transport",
    label: "Storage & Transport",
    shortDescription: "Gun cases, range bags, and home safes.",
    icon: "gun-case",
  },
] as const;

export const GEAR_CHECKLIST_ITEMS = [
  "Firearm",
  "Holster",
  "Belt",
  "Eye protection",
  "Ear protection",
  "100 rounds (+50 per extra gun)",
  "Spare magazine",
  "6 snap caps",
  "Gun case",
] as const;

export const GEAR_INTRO =
  "Most CCW instructors ask you to bring the same core gear: a handgun, holster, stiff belt, eye and ear protection, ammo, and a few extras. Here’s what to look for and where to start — whether you’re prepping for your class or upgrading your everyday carry.";
