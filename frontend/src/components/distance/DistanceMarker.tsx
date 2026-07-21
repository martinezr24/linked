import { StyleSheet, Text, View } from "react-native";

import { AvatarImage } from "@/components/ui/AvatarImage";
import { colors } from "@/theme/tokens";

type Props = {
  initial: string;
  avatarUrl?: string;
  /** City name rendered as a pill directly below the avatar. */
  city?: string;
  /** Border color — defaults to the app's pink/red accent. */
  ringColor?: string;
  fallbackColor?: string;
  size?: number;
};

/** Circular profile picture ringed in the accent color, used as a map marker. */
export function DistanceMarker({
  initial,
  avatarUrl,
  city,
  ringColor = colors.accent.primary,
  fallbackColor = colors.avatar.partner,
  size = 44,
}: Props) {
  const ring = size + 6;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.ring,
          {
            borderColor: ringColor,
            width: ring,
            height: ring,
            borderRadius: ring / 2,
          },
        ]}
      >
        <AvatarImage
          url={avatarUrl}
          initial={initial}
          fallbackColor={fallbackColor}
          size={size}
        />
      </View>
      {city ? (
        <View style={styles.cityPill}>
          <Text style={styles.cityText} numberOfLines={1}>
            {city}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  ring: {
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.canvas,
  },
  cityPill: {
    marginTop: 5,
    backgroundColor: "rgba(12,10,11,0.92)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  cityText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "DMSans_600SemiBold",
  },
});

