// Map county slugs to image paths in public/county-images
export const COUNTY_IMAGES: Record<string, string> = {
  "los-angeles": "/county-images/los-angeles.png",
  "orange": "/county-images/orange.png",
  "riverside": "/county-images/riverside.png",
  "sacramento": "/county-images/sacramento.jpg",
  "san-diego": "/county-images/san-diego.png",
  "san-bernardino": "/county-images/san-bernardino.jpg",
};

export function getCountyImageUrl(countySlug: string): string | undefined {
  return COUNTY_IMAGES[countySlug];
}
