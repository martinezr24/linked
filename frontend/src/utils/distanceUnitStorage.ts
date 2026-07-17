import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { DistanceUnit } from "./distance";

const KEY = "linked_distance_unit";

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

export async function loadDistanceUnit(): Promise<DistanceUnit> {
  try {
    return (await getItem(KEY)) === "km" ? "km" : "mi";
  } catch {
    return "mi";
  }
}

export async function saveDistanceUnit(unit: DistanceUnit): Promise<void> {
  try {
    await setItem(KEY, unit);
  } catch {
    // Non-critical preference; ignore storage failures.
  }
}
