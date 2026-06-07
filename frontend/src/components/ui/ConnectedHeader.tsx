import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppMark } from "./AppMark";
import { AppText } from "./AppText";
import { ConnectionLink } from "./ConnectionLink";
import { StreakPill } from "./StreakPill";
import { useTheme } from "@/theme/useTheme";

type Props = {
  streakCount: number;
  mineInitial?: string;
  partnerInitial?: string;
  partnerPhotoSent?: boolean;
  minePhotoSent?: boolean;
  headerRight?: ReactNode;
};

function AvatarCircle({
  initial,
  checkedIn,
  variant,
}: {
  initial: string;
  checkedIn?: boolean;
  variant: "mine" | "partner";
}) {
  const theme = useTheme();
  const bg =
    variant === "mine"
      ? theme.colors.avatar.mine
      : theme.colors.avatar.partner;

  return (
    <View style={[styles.avatar, { backgroundColor: bg }]}>
      <AppText variant="bodySemibold" style={styles.avatarText}>
        {initial}
      </AppText>
      {checkedIn ? (
        <View
          style={[
            styles.checkBadge,
            { backgroundColor: theme.colors.accent.primary },
          ]}
        >
          <AppText style={styles.checkMark}>✓</AppText>
        </View>
      ) : null}
    </View>
  );
}

export function ConnectedHeader({
  streakCount,
  mineInitial = "M",
  partnerInitial = "Y",
  partnerPhotoSent,
  minePhotoSent,
  headerRight,
}: Props) {
  return (
    <View style={styles.row}>
      <AppMark size={32} />
      <View style={styles.center}>
        <View style={styles.avatars}>
          <AvatarCircle
            initial={mineInitial.slice(0, 1).toUpperCase()}
            checkedIn={minePhotoSent}
            variant="mine"
          />
          <ConnectionLink length={36} showBow />
          <AvatarCircle
            initial={partnerInitial.slice(0, 1).toUpperCase()}
            checkedIn={partnerPhotoSent}
            variant="partner"
          />
        </View>
      </View>
      <View style={styles.right}>
        {headerRight}
        <StreakPill count={streakCount} />
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: "DMSans_700Bold" },
  checkBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
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
