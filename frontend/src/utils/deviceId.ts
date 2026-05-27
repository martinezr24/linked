import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync("device_id");
  if (!id) {
    id = Crypto.randomUUID();
    await SecureStore.setItemAsync("device_id", id);
  }
  return id;
}
