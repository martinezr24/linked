import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "linked_streak_banner_seen";

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

function todayKey(): string {
  return new Date().toDateString();
}

/** Whether the "streak secured" banner has already been shown/dismissed today. */
export async function wasStreakBannerSeenToday(): Promise<boolean> {
  try {
    return (await getItem(KEY)) === todayKey();
  } catch {
    return false;
  }
}

/** Remember that the banner has been seen for the rest of today. */
export async function markStreakBannerSeen(): Promise<void> {
  try {
    await setItem(KEY, todayKey());
  } catch {
    // Non-critical UI flag; ignore storage failures.
  }
}
