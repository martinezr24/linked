import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

import type { WidgetSummary } from "@/types";

const WIDGET_DATA_KEY = "linked_widget_summary";

async function writeWidgetData(json: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(WIDGET_DATA_KEY, json);
    return;
  }
  await SecureStore.setItemAsync(WIDGET_DATA_KEY, json);
}

export async function syncWidgetData(summary: WidgetSummary) {
  await writeWidgetData(JSON.stringify(summary));
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
