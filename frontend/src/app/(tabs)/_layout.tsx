import { Redirect, Tabs } from "expo-router";

import { useRelationship } from "@/context/RelationshipContext";

export default function TabsLayout() {
  const { isReady, isPaired } = useRelationship();

  if (!isReady) {
    return null;
  }

  if (!isPaired) {
    return <Redirect href="/pair" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#888",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Home", tabBarLabel: "Home" }}
      />
      <Tabs.Screen
        name="trip"
        options={{ title: "Trip", tabBarLabel: "Trip" }}
      />
      <Tabs.Screen
        name="together"
        options={{ title: "Together", tabBarLabel: "Together" }}
      />
      <Tabs.Screen
        name="events"
        options={{ title: "Events", tabBarLabel: "Events" }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: "Settings", tabBarLabel: "Settings" }}
      />
    </Tabs>
  );
}
