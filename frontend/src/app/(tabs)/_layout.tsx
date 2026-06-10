import { Platform, StyleSheet } from "react-native";
import { Redirect, Tabs } from "expo-router";
import { BlurView } from "expo-blur";

import {
  TabEventsIcon,
  TabHomeIcon,
  TabPlansIcon,
  TabPlayIcon,
  TabSettingsIcon,
} from "@/components/ui/TabIcons";
import { useRelationship } from "@/context/RelationshipContext";
import { colors } from "@/theme/tokens";

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
        tabBarActiveTintColor: colors.text.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={60}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : undefined,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabHomeIcon
              color={focused ? colors.text.primary : colors.text.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          title: "Plans",
          tabBarLabel: "Plans",
          tabBarIcon: ({ focused }) => (
            <TabPlansIcon
              color={focused ? colors.text.primary : colors.text.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="trip"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="together"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="play"
        options={{
          title: "Us",
          tabBarLabel: "Us",
          tabBarIcon: ({ focused }) => (
            <TabPlayIcon
              color={focused ? colors.text.primary : colors.text.muted}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Calendar",
          tabBarLabel: "Calendar",
          tabBarIcon: ({ focused }) => (
            <TabEventsIcon
              color={focused ? colors.text.primary : colors.text.muted}
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
            <TabSettingsIcon
              color={focused ? colors.text.primary : colors.text.muted}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    backgroundColor: Platform.OS === "ios" ? "transparent" : colors.overlay.glass,
    borderTopColor: colors.border.subtle,
    borderTopWidth: 1,
    height: Platform.OS === "ios" ? 88 : 64,
    paddingTop: 8,
  },
  tabLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
  },
});
