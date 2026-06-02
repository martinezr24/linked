import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RelationshipProvider } from "@/context/RelationshipContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RelationshipProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </RelationshipProvider>
    </SafeAreaProvider>
  );
}
