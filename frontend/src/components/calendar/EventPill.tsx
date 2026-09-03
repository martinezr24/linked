import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/theme/useTheme";
import { eventColorFor } from "@/utils/eventColors";
import type { SharedEvent } from "@/types";

type Props = {
  event: SharedEvent;
  width: number;
  left: number;
  top: number;
  isSegmentStart: boolean;
  isSegmentEnd: boolean;
  onPress: (event: SharedEvent) => void;
};

export function EventPill({
  event,
  width,
  left,
  top,
  isSegmentStart,
  isSegmentEnd,
  onPress,
}: Props) {
  const theme = useTheme();
  const { mineColor, partnerColor, sharedColor } = useProfile();
  const profileColors = { mineColor, partnerColor, sharedColor };
  const ownerType = event.ownerType ?? "shared";
  const isGoogleEvent = event.ownerLabel === "google" || event.id.startsWith("gcal_");
  const colors = eventColorFor(ownerType, theme, profileColors);

  const borderRadius = {
    borderTopLeftRadius: isSegmentStart ? 9 : 2,
    borderBottomLeftRadius: isSegmentStart ? 9 : 2,
    borderTopRightRadius: isSegmentEnd ? 9 : 2,
    borderBottomRightRadius: isSegmentEnd ? 9 : 2,
  };

  return (
    <Pressable
      onPress={() => onPress(event)}
      style={[
        styles.pill,
        {
          width,
          left,
          top,
          ...borderRadius,
        },
      ]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.bg },
          borderRadius,
        ]}
      />
      <View style={styles.content}>
        {isSegmentStart && isGoogleEvent && (
          <Text style={styles.googleBadge}>G</Text>
        )}
        <AppText
          variant="caption"
          numberOfLines={1}
          style={[styles.label, { color: colors.text }]}
        >
          {isSegmentStart ? event.title : " "}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: "absolute",
    height: 18,
    justifyContent: "center",
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    height: 18,
    overflow: "hidden",
  },
  label: {
    flexShrink: 1,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0,
    fontWeight: "600",
  },
  googleBadge: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "800",
    color: "#fff",
    backgroundColor: "#4285F4",
    borderRadius: 3,
    paddingHorizontal: 2,
    marginRight: 3,
    overflow: "hidden",
    flexShrink: 0,
  },
});
