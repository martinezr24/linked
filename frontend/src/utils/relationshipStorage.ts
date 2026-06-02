import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function getStoredRelationshipId(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined"
      ? window.localStorage.getItem("relationship_id")
      : null;
  }
  return SecureStore.getItemAsync("relationship_id");
}

export async function setStoredRelationshipId(id: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem("relationship_id", id);
  } else {
    await SecureStore.setItemAsync("relationship_id", id);
  }
}

export async function clearStoredRelationshipId(): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem("relationship_id");
  } else {
    await SecureStore.deleteItemAsync("relationship_id");
  }
}
