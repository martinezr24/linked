import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SyncBootstrap } from "@/components/SyncBootstrap";
import { QueryProvider } from "@/context/QueryProvider";
import { RelationshipProvider } from "@/context/RelationshipContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <RelationshipProvider>
          <SyncBootstrap />
          <Stack screenOptions={{ headerShown: false }} />
        </RelationshipProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}
