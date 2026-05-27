import "react-native-gesture-handler";

import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

export default function RootLayout() {
  useEffect(() => {
    SecureStore.getItemAsync("relationship_id").then((id) => {
      if (!id) {
        router.replace("/pair");
      }
    });
  }, []);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
