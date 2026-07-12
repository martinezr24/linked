import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { useRelationship } from "@/context/RelationshipContext";
import { useTheme } from "@/theme/useTheme";

type BannerData = { title: string; body: string };

/**
 * Listens for realtime NUDGE websocket events and shows a transient banner
 * when the partner sends a quick reminder while the app is open.
 */
export function NudgeBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { subscribe } = useRelationship();
  const [banner, setBanner] = useState<BannerData | null>(null);
  const translateY = useRef(new Animated.Value(-160)).current;
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -160,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setBanner(null));
  }, [translateY]);

  useEffect(() => {
    const unsub = subscribe((msg) => {
      if (msg.action !== "NUDGE") return;
      const title =
        typeof msg.payload.title === "string" ? msg.payload.title : "Nudge";
      const body =
        typeof msg.payload.body === "string" ? msg.payload.body : "";
      setBanner({ title, body });
    });
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    if (!banner) return;
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = setTimeout(() => dismiss(), 4200);
    return () => {
      if (hideRef.current) clearTimeout(hideRef.current);
    };
  }, [banner, translateY, dismiss]);

  if (!banner) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss nudge"
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface.cardElevated,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        <AppText variant="bodySemibold">{banner.title}</AppText>
        {banner.body ? (
          <AppText variant="caption" color="secondary" style={styles.body}>
            {banner.body}
          </AppText>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  body: {
    marginTop: 2,
  },
});
