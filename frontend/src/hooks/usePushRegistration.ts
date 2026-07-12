import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { registerPushToken } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";

/**
 * Requests notification permission and registers this device's Expo push token
 * with the backend so a partner's nudges can arrive while the app is closed.
 * Every native call is guarded so that a build without the notifications
 * native module (e.g. an older dev client) simply no-ops instead of crashing.
 */
export function usePushRegistration() {
  const { deviceId } = useRelationship();

  useEffect(() => {
    if (!deviceId || !Device.isDevice) return;
    let cancelled = false;

    (async () => {
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
          const requested = await Notifications.requestPermissionsAsync();
          granted = requested.granted;
        }
        if (!granted) return;

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        const tokenResp = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined,
        );
        if (cancelled || !tokenResp.data) return;

        await registerPushToken(deviceId, tokenResp.data, Platform.OS);
      } catch {
        // Best-effort: push simply won't be available for this device.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deviceId]);
}
