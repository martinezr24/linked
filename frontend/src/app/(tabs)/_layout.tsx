import { Image } from "react-native";
import { Redirect, Tabs } from "expo-router";

import { useRelationship } from "@/context/RelationshipContext";

const homeIcon = require("../../../assets/images/tabIcons/home.png");
const exploreIcon = require("../../../assets/images/tabIcons/explore.png");

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
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <Image
              source={homeIcon}
              style={{
                width: 24,
                height: 24,
                opacity: focused ? 1 : 0.45,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{
          title: "Trip",
          tabBarLabel: "Trip",
          tabBarIcon: ({ focused }) => (
            <Image
              source={exploreIcon}
              style={{
                width: 24,
                height: 24,
                opacity: focused ? 1 : 0.45,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="together"
        options={{
          title: "Together",
          tabBarLabel: "Together",
          tabBarIcon: ({ focused }) => (
            <Image
              source={exploreIcon}
              style={{
                width: 24,
                height: 24,
                opacity: focused ? 1 : 0.45,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarLabel: "Events",
          tabBarIcon: ({ focused }) => (
            <Image
              source={exploreIcon}
              style={{
                width: 24,
                height: 24,
                opacity: focused ? 1 : 0.45,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: "Settings",
          tabBarIcon: ({ focused }) => (
            <Image
              source={homeIcon}
              style={{
                width: 24,
                height: 24,
                opacity: focused ? 0.35 : 0.25,
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
