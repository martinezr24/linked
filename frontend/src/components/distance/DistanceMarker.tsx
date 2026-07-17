import { StyleSheet, View } from "react-native";

import { AvatarImage } from "@/components/ui/AvatarImage";
import { colors } from "@/theme/tokens";

type Props = {
  initial: string;
  avatarUrl?: string;
  /** Border color — defaults to the app's pink/red accent. */
  ringColor?: string;
  fallbackColor?: string;
  size?: number;
};

/** Circular profile picture ringed in the accent color, used as a map marker. */
export function DistanceMarker({
  initial,
  avatarUrl,
  ringColor = colors.accent.primary,
  fallbackColor = colors.avatar.partner,
  size = 44,
}: Props) {
  const ring = size + 6;

  return (
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
  );
}

const styles = StyleSheet.create({
  ring: {
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.canvas,
  },
});
