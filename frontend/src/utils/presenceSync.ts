import * as Battery from "expo-battery";

import { apiFetch } from "@/utils/api";
import { getDeviceTimezoneLabel } from "@/utils/dates";
import { getWeatherCity } from "@/utils/weatherCity";
import * as Location from "expo-location";

/** Push timezone, location, battery, and status so your partner can see them. */
export async function syncMyPresence(
  deviceId: string,
  statusMessage?: string,
): Promise<void> {
  const timezone = getDeviceTimezoneLabel();

  // A manually-set city (if any) is the fallback; we prefer a city
  // reverse-geocoded from the live location below so it stays accurate
  // without the user having to type it in.
  let weatherCity = (await getWeatherCity()) ?? undefined;

  let weatherLat: number | undefined;
  let weatherLon: number | undefined;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      weatherLat = pos.coords.latitude;
      weatherLon = pos.coords.longitude;

      try {
        const places = await Location.reverseGeocodeAsync({
          latitude: weatherLat,
          longitude: weatherLon,
        });
        const place = places[0];
        const city = place?.city || place?.subregion || place?.region;
        if (city) weatherCity = city;
      } catch {
        // Reverse geocode unavailable — keep the stored/manual city fallback.
      }
    }
  } catch {
    // Location unavailable — city fallback may still work
  }

  let batteryPercent: number | undefined;
  try {
    const level = await Battery.getBatteryLevelAsync();
    if (level >= 0) {
      batteryPercent = Math.round(level * 100);
    }
  } catch {
    // Battery API unavailable on some platforms
  }

  await apiFetch("/api/profile/presence", deviceId, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timezone,
      weatherCity,
      weatherLat,
      weatherLon,
      batteryPercent,
      statusMessage: statusMessage?.trim() || undefined,
    }),
  });
}
