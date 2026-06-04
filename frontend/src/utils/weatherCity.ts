import * as SecureStore from "expo-secure-store";

const KEY = "linked_weather_city";

export async function getWeatherCity(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setWeatherCity(city: string): Promise<void> {
  const trimmed = city.trim();
  if (trimmed) {
    await SecureStore.setItemAsync(KEY, trimmed);
  } else {
    await SecureStore.deleteItemAsync(KEY);
  }
}
