import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppMark } from "./AppMark";
import { AppText } from "./AppText";
import { AvatarImage } from "./AvatarImage";
import { ConnectionLink } from "./ConnectionLink";
import { HeartIcon } from "./icons";
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
};

function AvatarCircle({
  initial,
  avatarUrl,
  bgColor,
  checkedIn,
}: {
  initial: string;
  avatarUrl?: string;
  bgColor: string;
  checkedIn?: boolean;
}) {
  const theme = useTheme();

  return (
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
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <AppMark size={32} />
      <View style={styles.center}>
        <View style={styles.avatars}>
          <AvatarCircle
            initial={mineInitial.slice(0, 1).toUpperCase()}
            avatarUrl={mineAvatarUrl}
            bgColor={mineColor ?? theme.colors.avatar.mine}
            checkedIn={minePhotoSent}
          />
          <ConnectionLink length={36} showBow />
          <AvatarCircle
            initial={partnerInitial.slice(0, 1).toUpperCase()}
            avatarUrl={partnerAvatarUrl}
            bgColor={partnerColor ?? theme.colors.avatar.partner}
            checkedIn={partnerPhotoSent}
          />
        </View>
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
