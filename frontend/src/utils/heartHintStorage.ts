import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY = "orbit_heart_hint_seen";

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

/** Whether the "hold to send a heart" hint has already been shown once. */
export async function wasHeartHintSeen(): Promise<boolean> {
  try {
    return (await getItem(KEY)) === "1";
  } catch {
    return false;
  }
}

/** Remember that the heart hint has been shown, so it doesn't auto-appear again. */
export async function markHeartHintSeen(): Promise<void> {
  try {
    await setItem(KEY, "1");
  } catch {
    // Non-critical UI flag; ignore storage failures.
  }
}
