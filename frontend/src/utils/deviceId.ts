import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

export async function getOrCreateDeviceId(): Promise<string> {
  if (Platform.OS === "web") {
    const existing =
      typeof window !== "undefined"
        ? window.localStorage.getItem("device_id")
        : null;

    if (existing) return existing;

    const next = Crypto.randomUUID();
    if (typeof window !== "undefined") {
      window.localStorage.setItem("device_id", next);
    }
    return next;
  }

  let id = await SecureStore.getItemAsync("device_id");
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync("device_id", id);
  }
  return id;
}
