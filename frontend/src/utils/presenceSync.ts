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
