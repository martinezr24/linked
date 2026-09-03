import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import { setWidgetValue } from "../../modules/orbit-widgets";
import { fetchWidgetSummary } from "@/api/fetchers";
import type { WidgetSummary } from "@/types";

const WIDGET_DATA_KEY = "linked_widget_summary";
// Must match the App Group in app.json ios.entitlements and the widget target.
const APP_GROUP = "group.com.martinez.orbit";

async function writeWidgetData(json: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(WIDGET_DATA_KEY, json);
    return;
  }
  // SecureStore copy powers the in-app WidgetPreviewCard.
  await SecureStore.setItemAsync(WIDGET_DATA_KEY, json);
  // App Group copy is what the native iOS widget reads (also reloads timelines).
  if (Platform.OS === "ios") {
    setWidgetValue(WIDGET_DATA_KEY, json, APP_GROUP);
  }
}

export async function syncWidgetData(summary: WidgetSummary) {
  await writeWidgetData(JSON.stringify(summary));
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
