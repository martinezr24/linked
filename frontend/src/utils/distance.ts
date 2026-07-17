export type LatLng = { lat: number; lon: number };

export type DistanceUnit = "mi" | "km";

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in meters (Haversine). */
export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function metersToMiles(m: number): number {
  return m / 1609.344;
}

export function metersToKm(m: number): number {
  return m / 1000;
}

/** Rounded distance with thousands separators, e.g. "1,234". */
export function formatDistance(meters: number, unit: DistanceUnit): string {
  const value = Math.round(
    unit === "mi" ? metersToMiles(meters) : metersToKm(meters),
  );
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
}

/**
 * A react-native-maps region that frames both points with padding so the
 * markers sit comfortably inside the viewport. `paddingFactor` enlarges the
 * span (1.8 ≈ ~40% margin on each side); the min delta avoids over-zooming
 * when the two points are very close together.
 */
export function regionForCoords(a: LatLng, b: LatLng, paddingFactor = 1.8) {
  const mid = midpoint(a, b);
  const latitudeDelta = Math.max(Math.abs(a.lat - b.lat) * paddingFactor, 0.06);
  const longitudeDelta = Math.max(
    Math.abs(a.lon - b.lon) * paddingFactor,
    0.06,
  );
  return {
    latitude: mid.lat,
    longitude: mid.lon,
    latitudeDelta,
    longitudeDelta,
  };
}
