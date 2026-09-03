import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { registerPushToken } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";

/**
 * Requests notification permission and registers this device's Expo push token
 * with the backend so a partner's nudges can arrive while the app is closed.
 * Re-runs when the app comes to the foreground so a new TestFlight/APNs token
 * is uploaded. Native calls are guarded so older dev clients no-op instead of crashing.
 */
export function usePushRegistration() {
  const { deviceId } = useRelationship();

  useEffect(() => {
    if (!deviceId || !Device.isDevice) return;
    let cancelled = false;

    const register = async () => {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });

        const existing = await Notifications.getPermissionsAsync();
        let granted = existing.granted;
        if (!granted && existing.canAskAgain) {
          const requested = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          granted = requested.granted;
        }
        if (!granted) {
          console.warn("push: notification permission not granted");
          return;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        if (!projectId) {
          console.warn("push: missing EAS projectId");
        }
        const tokenResp = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !tokenResp.data) return;

        await registerPushToken(deviceId, tokenResp.data, Platform.OS);
      } catch (err) {
        console.warn("push: registration failed", err);
      }
    };

    void register();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void register();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [deviceId]);
}
