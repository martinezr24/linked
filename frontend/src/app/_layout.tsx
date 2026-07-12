import "react-native-gesture-handler";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { NudgeBanner } from "@/components/NudgeBanner";
import { SyncBootstrap } from "@/components/SyncBootstrap";
import { QueryProvider } from "@/context/QueryProvider";
import { RelationshipProvider } from "@/context/RelationshipContext";
import { ThemeProvider } from "@/theme/ThemeProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <RelationshipProvider>
            <SyncBootstrap />
            <NudgeBanner />
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="streak"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen
                name="photos/memories"
                options={{ presentation: "modal", headerShown: false }}
              />
              <Stack.Screen name="draw" options={{ headerShown: false }} />
              <Stack.Screen
                name="drawings/index"
                options={{ headerShown: false }}
              />
            </Stack>
          </RelationshipProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
