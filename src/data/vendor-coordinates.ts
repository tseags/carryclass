// Approximate [lat, lng] for California cities (used for map pins)
export const CITY_COORDINATES: Record<string, [number, number]> = {
  Fresno: [36.7378, -119.7871],
  Sacramento: [38.5816, -121.4944],
  Oakland: [37.8044, -122.2712],
  "San Bernardino": [34.1083, -117.2898],
  "Los Angeles": [34.0522, -118.2437],
  "San Diego": [32.7157, -117.1611],
  Eureka: [40.8021, -124.1637],
  "South Lake Tahoe": [38.9332, -119.9772],
  "San Luis Obispo": [35.2828, -120.6596],
  "San Jose": [37.3382, -121.8863],
  Bakersfield: [35.3733, -119.0187],
  Riverside: [33.9533, -117.3962],
  Irvine: [33.6846, -117.8265],
  Ventura: [34.2746, -119.229],
  Salinas: [36.6777, -121.6555],
  Redding: [40.5865, -122.3917],
};

/** County seat / rough center when city is not in CITY_COORDINATES */
const COUNTY_CENTER: Record<string, [number, number]> = {
  orange: [33.7879, -117.8531],
  ventura: [34.3705, -119.1391],
  monterey: [36.6002, -121.8947],
  shasta: [40.5865, -122.3917],
};

export function getCoordinatesForCity(city: string): [number, number] | null {
  return CITY_COORDINATES[city] ?? null;
}

export function getCoordinatesForVendor(city: string, countySlug: string): [number, number] | null {
  return getCoordinatesForCity(city) ?? COUNTY_CENTER[countySlug] ?? null;
}
