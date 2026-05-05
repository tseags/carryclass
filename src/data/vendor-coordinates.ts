export type Coordinates = [number, number];

// Approximate [lat, lng] for California cities (used for map pins)
export const CITY_COORDINATES: Record<string, Coordinates> = {
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

/** County seat / rough center coordinates for California counties. */
export const COUNTY_CENTER: Record<string, Coordinates> = {
  alameda: [37.6017, -121.7195],
  alpine: [38.5977, -119.8246],
  amador: [38.4455, -120.6566],
  butte: [39.665, -121.6019],
  calaveras: [38.2055, -120.5542],
  colusa: [39.2143, -122.0094],
  "contra-costa": [37.8534, -121.9018],
  "del-norte": [41.7499, -124.1748],
  "el-dorado": [38.7386, -120.4358],
  fresno: [36.7477, -119.7724],
  glenn: [39.6026, -122.3933],
  humboldt: [40.745, -123.8695],
  imperial: [32.8475, -115.5683],
  inyo: [36.6061, -117.8332],
  kern: [35.3733, -119.0187],
  kings: [36.3275, -119.6457],
  lake: [39.0525, -122.9158],
  lassen: [40.4163, -120.653],
  "los-angeles": [34.0522, -118.2437],
  madera: [36.9613, -120.0607],
  marin: [38.0834, -122.7633],
  mariposa: [37.5707, -119.9039],
  mendocino: [39.3077, -123.7995],
  merced: [37.3022, -120.4829],
  modoc: [41.5892, -120.7241],
  mono: [37.9389, -118.8877],
  monterey: [36.6002, -121.8947],
  napa: [38.5025, -122.2654],
  nevada: [39.261, -121.0161],
  orange: [33.7175, -117.8311],
  placer: [38.8966, -121.0769],
  plumas: [39.914, -120.9472],
  riverside: [33.9806, -117.3755],
  sacramento: [38.5816, -121.4944],
  "san-benito": [36.8525, -121.4016],
  "san-bernardino": [34.1083, -117.2898],
  "san-diego": [32.7157, -117.1611],
  "san-francisco": [37.7749, -122.4194],
  "san-joaquin": [37.934, -121.2722],
  "san-luis-obispo": [35.2828, -120.6596],
  "san-mateo": [37.4337, -122.4014],
  "santa-barbara": [34.4208, -119.6982],
  "santa-clara": [37.3541, -121.9552],
  "santa-cruz": [36.9741, -122.0308],
  shasta: [40.5865, -122.3917],
  sierra: [39.5807, -120.5166],
  siskiyou: [41.7354, -122.6344],
  solano: [38.2517, -122.039],
  sonoma: [38.2919, -122.458],
  stanislaus: [37.6391, -120.9969],
  sutter: [39.0349, -121.6958],
  tehama: [40.1785, -122.2361],
  trinity: [40.647, -122.929],
  tulare: [36.2077, -119.3473],
  tuolumne: [37.9624, -120.4208],
  ventura: [34.3705, -119.1391],
  yolo: [38.6829, -121.9018],
  yuba: [39.262, -121.3532],
};

export function getCoordinatesForCity(city: string): Coordinates | null {
  return CITY_COORDINATES[city] ?? null;
}

export function getCoordinatesForCounty(countySlug: string): Coordinates | null {
  return COUNTY_CENTER[countySlug] ?? null;
}

export function getCoordinatesForVendor(city: string, countySlug: string): Coordinates | null {
  return getCoordinatesForCity(city) ?? COUNTY_CENTER[countySlug] ?? null;
}
