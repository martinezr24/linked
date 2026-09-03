import { useEffect } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { OrbitSpinner } from "@/components/ui/OrbitSpinner";
import { ScreenBackground } from "@/components/ui/ScreenBackground";

/** Lands after Google OAuth redirects to orbit://google-calendar/connected. */
export default function GoogleCalendarConnectedScreen() {
  const { invalidateGoogle } = useGoogleCalendar();

  useEffect(() => {
    invalidateGoogle();
    const t = setTimeout(() => {
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/events");
    }, 400);
    return () => clearTimeout(t);
  }, [invalidateGoogle]);

  return (
    <ScreenBackground>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <OrbitSpinner />
      </View>
    </ScreenBackground>
  );
}
