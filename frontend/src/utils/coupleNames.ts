import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const MINE_KEY = "linked_display_name_mine";
const PARTNER_KEY = "linked_display_name_partner";

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

export async function getMyDisplayName(): Promise<string | null> {
  const v = await getItem(MINE_KEY);
  return v?.trim() || null;
}

export async function setMyDisplayName(name: string): Promise<void> {
  await setItem(MINE_KEY, name.trim());
}

export async function getPartnerDisplayName(): Promise<string | null> {
  const v = await getItem(PARTNER_KEY);
  return v?.trim() || null;
}

export async function setPartnerDisplayName(name: string): Promise<void> {
  await setItem(PARTNER_KEY, name.trim());
}

export function initialFromName(name: string | null | undefined, fallback: string): string {
  const n = name?.trim();
  if (!n) return fallback.slice(0, 1).toUpperCase();
  return n.slice(0, 1).toUpperCase();
}
