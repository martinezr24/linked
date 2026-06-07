import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/AppText";
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
  const ownerType = event.ownerType ?? "shared";
  const colors = eventColorFor(ownerType, theme);

  const borderRadius = {
    borderTopLeftRadius: isSegmentStart ? 9 : 2,
    borderBottomLeftRadius: isSegmentStart ? 9 : 2,
    borderTopRightRadius: isSegmentEnd ? 9 : 2,
    borderBottomRightRadius: isSegmentEnd ? 9 : 2,
  };

  const content = (
    <AppText
      variant="caption"
      numberOfLines={1}
      style={[styles.label, { color: colors.text }]}
    >
      {isSegmentStart ? event.title : " "}
    </AppText>
  );

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
      {ownerType === "shared" ? (
        <LinearGradient
          colors={[theme.colors.event.self.bg, theme.colors.event.partner.bg]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, borderRadius]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.bg },
            borderRadius,
          ]}
        />
      )}
      {content}
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
  label: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0,
    fontWeight: "600",
  },
});
