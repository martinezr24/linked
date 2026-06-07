import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { CalendarTimezoneMode } from "@/types";

const MODE_KEY = "linked_calendar_tz_mode";
const CUSTOM_KEY = "linked_calendar_tz_custom";

export type CalendarTimezonePreference = {
  mode: CalendarTimezoneMode;
  customTz: string;
};

const DEFAULT: CalendarTimezonePreference = {
  mode: "device",
  customTz: "UTC",
};

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function loadCalendarTimezonePreference(): Promise<CalendarTimezonePreference> {
  const [modeRaw, customTz] = await Promise.all([
    getItem(MODE_KEY),
    getItem(CUSTOM_KEY),
  ]);
  const mode =
    modeRaw === "device" || modeRaw === "partner" || modeRaw === "custom"
      ? modeRaw
      : DEFAULT.mode;
  return {
    mode,
    customTz: customTz?.trim() || DEFAULT.customTz,
  };
}

export async function saveCalendarTimezonePreference(
  pref: CalendarTimezonePreference,
): Promise<void> {
  await Promise.all([
    setItem(MODE_KEY, pref.mode),
    setItem(CUSTOM_KEY, pref.customTz),
  ]);
}
