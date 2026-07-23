import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppMark } from "./AppMark";
import { AppText } from "./AppText";
import { AvatarImage } from "./AvatarImage";
import { HeartIcon } from "./icons";
import { SharedOrbit } from "./SharedOrbit";
import { StreakPill } from "./StreakPill";
import { useTheme } from "@/theme/useTheme";

type Props = {
  streakCount: number;
  mineInitial?: string;
  partnerInitial?: string;
  mineAvatarUrl?: string;
  partnerAvatarUrl?: string;
  mineColor?: string;
  partnerColor?: string;
  partnerPhotoSent?: boolean;
  minePhotoSent?: boolean;
  showStreak?: boolean;
  headerRight?: ReactNode;
  /** Tap your own avatar to change your photo. */
  onMinePress?: () => void;
  /** Long-press your partner's avatar to send a "thinking of you" pulse. */
  onPartnerLongPress?: () => void;
  /** Energize the shared orbit (e.g. when you're both online right now). */
  energized?: boolean;
};

function AvatarCircle({
  initial,
  avatarUrl,
  bgColor,
  checkedIn,
  onPress,
  onLongPress,
  accessibilityLabel,
}: {
  initial: string;
  avatarUrl?: string;
  bgColor: string;
  checkedIn?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();

  const content = (
    <View style={styles.avatarWrap}>
      <AvatarImage
        url={avatarUrl}
        initial={initial}
        fallbackColor={bgColor}
        size={40}
      />
      {checkedIn ? (
        <View
          style={[
            styles.checkBadge,
            {
              backgroundColor: theme.colors.accent.primary,
              borderColor: theme.colors.surface.card,
            },
          ]}
        >
          <HeartIcon size={9} color={theme.colors.text.onAccent} />
        </View>
      ) : null}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={280}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? "Open account settings"}
      >
        {content}
      </Pressable>
    );
  }
  return content;
}

export function ConnectedHeader({
  streakCount,
  mineInitial = "M",
  partnerInitial = "Y",
  mineAvatarUrl,
  partnerAvatarUrl,
  mineColor,
  partnerColor,
  partnerPhotoSent,
  minePhotoSent,
  showStreak = true,
  headerRight,
  onMinePress,
  onPartnerLongPress,
  energized = false,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <AppMark size={32} />
      <View style={styles.center}>
        <SharedOrbit
          energized={energized}
          left={
            <AvatarCircle
              initial={mineInitial.slice(0, 1).toUpperCase()}
              avatarUrl={mineAvatarUrl}
              bgColor={mineColor ?? theme.colors.avatar.mine}
              checkedIn={minePhotoSent}
              onPress={onMinePress}
            />
          }
          right={
            <AvatarCircle
              initial={partnerInitial.slice(0, 1).toUpperCase()}
              avatarUrl={partnerAvatarUrl}
              bgColor={partnerColor ?? theme.colors.avatar.partner}
              checkedIn={partnerPhotoSent}
              onLongPress={onPartnerLongPress}
              accessibilityLabel="Send your partner a thinking-of-you pulse"
            />
          }
        />
      </View>
      <View style={styles.right}>
        {headerRight}
        {showStreak ? <StreakPill count={streakCount} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  center: { flex: 1, alignItems: "center", marginHorizontal: 8 },
  avatars: { flexDirection: "row", alignItems: "center", gap: 4 },
  avatarWrap: { position: "relative" },
  checkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "DMSans_700Bold",
  },
  right: { flexDirection: "row", alignItems: "center", gap: 8 },
});
