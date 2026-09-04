import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import {
  reloadWidgets,
  setWidgetValue,
  writeWidgetImage,
} from "../../modules/orbit-widgets";
import { fetchWidgetSummary } from "@/api/fetchers";
import { resolveMediaUrl } from "@/utils/mediaUrl";
import type { WidgetSummary } from "@/types";

const WIDGET_DATA_KEY = "linked_widget_summary";
// Must match the App Group in app.json ios.entitlements and the widget target.
const APP_GROUP = "group.com.martinez.orbit";

const IMAGE_SLOTS = [
  ["daily", "dailyPhotoUrl"],
  ["partner_photo", "partnerPhotoUrl"],
  ["my_avatar", "myAvatarUrl"],
  ["partner_avatar", "partnerAvatarUrl"],
] as const;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function writeWidgetData(json: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(WIDGET_DATA_KEY, json);
    return;
  }
  // SecureStore copy powers the in-app WidgetPreviewCard.
  await SecureStore.setItemAsync(WIDGET_DATA_KEY, json);
  // App Group copy is what the native iOS widget reads (reload happens after images).
  if (Platform.OS === "ios") {
    setWidgetValue(WIDGET_DATA_KEY, json, APP_GROUP);
  }
}

/** Download photos via the same network path as the app UI, then write App Group JPGs. */
async function cacheSummaryImages(summary: WidgetSummary) {
  if (Platform.OS !== "ios") return;

  await Promise.all(
    IMAGE_SLOTS.map(async ([slot, key]) => {
      const raw = summary[key];
      if (typeof raw !== "string" || raw.length === 0) {
        try {
          await writeWidgetImage(slot, "", APP_GROUP);
        } catch {
          // best-effort clear
        }
        return;
      }

      try {
        const absolute = resolveMediaUrl(raw);
        const res = await fetch(absolute);
        if (!res.ok) {
          await writeWidgetImage(slot, "", APP_GROUP);
          return;
        }
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength === 0) {
          await writeWidgetImage(slot, "", APP_GROUP);
          return;
        }
        await writeWidgetImage(slot, arrayBufferToBase64(buffer), APP_GROUP);
      } catch {
        // Keep any prior cached file; timeline can still try network fallback.
      }
    }),
  );
}

export async function syncWidgetData(summary: WidgetSummary) {
  await writeWidgetData(JSON.stringify(summary));
  await cacheSummaryImages(summary);
  if (Platform.OS === "ios") {
    reloadWidgets();
  }
}

/** Fetch latest summary from the API and push it into App Group / SecureStore. */
export async function fetchAndSyncWidgetData(deviceId: string) {
  const summary = await fetchWidgetSummary(deviceId);
  await syncWidgetData(summary);
  return summary;
}

export async function readWidgetData(): Promise<WidgetSummary | null> {
  try {
    const raw =
      Platform.OS === "web"
        ? localStorage.getItem(WIDGET_DATA_KEY)
        : await SecureStore.getItemAsync(WIDGET_DATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WidgetSummary;
  } catch {
    return null;
  }
}

/**
 * Native home-screen widgets read from WIDGET_DATA_KEY via App Groups (iOS)
 * or SharedPreferences (Android). See widgets/README.md for extension setup.
 */
export const widgetStorageKey = WIDGET_DATA_KEY;
