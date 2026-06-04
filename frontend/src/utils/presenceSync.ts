import * as Location from "expo-location";

import { apiFetch } from "@/utils/api";
import { getDeviceTimezoneLabel } from "@/utils/dates";
import { getWeatherCity } from "@/utils/weatherCity";

/** Push timezone + location so your partner can see local time and weather. */
export async function syncMyPresence(deviceId: string): Promise<void> {
  const timezone = getDeviceTimezoneLabel();
  const weatherCity = (await getWeatherCity()) ?? undefined;

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
    }
  } catch {
    // Location unavailable — city fallback may still work
  }

  await apiFetch("/api/profile/presence", deviceId, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      timezone,
      weatherCity,
      weatherLat,
      weatherLon,
    }),
  });
}
