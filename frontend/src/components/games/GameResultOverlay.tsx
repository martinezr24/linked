import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchGridStats } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import {
  BrokenHeartIcon,
  CelebrationIcon,
  HandshakeIcon,
  TrophyIcon,
} from "@/components/ui/icons";
import { resolveOutcome, resolveResult } from "@/games/catalog";
import { GAME_YOU_COLOR, GAME_OPPONENT_COLOR } from "@/games/playerIdentity";
import { useRelationship } from "@/context/RelationshipContext";
import { useTheme } from "@/theme/useTheme";
import type { GridGame } from "@/types";

type Props = {
  gameType: string;
  game: GridGame;
  partnerName: string;
  onPlayAgain: () => void;
  onBack: () => void;
  playAgainLoading?: boolean;
};

export function GameResultOverlay({
  gameType,
  game,
  partnerName,
  onPlayAgain,
  onBack,
  playAgainLoading,
}: Props) {
  const theme = useTheme();
  const { deviceId } = useRelationship();

  const outcome = resolveOutcome(game);
  const headline = resolveResult({ game, partnerName });
  const collaborative = gameType === "wordguess";

  const { data: stats } = useQuery({
    queryKey: queryKeys.gridStats(gameType),
    queryFn: () => fetchGridStats(deviceId!, gameType),
    enabled: Boolean(deviceId),
  });

  const accent =
    outcome === "win"
      ? theme.colors.accent.success
      : outcome === "lose"
        ? theme.colors.accent.primary
        : theme.colors.text.secondary;

  const ResultIcon = collaborative
    ? CelebrationIcon
    : outcome === "win"
      ? TrophyIcon
      : outcome === "lose"
        ? BrokenHeartIcon
        : HandshakeIcon;

  return (
    <View style={styles.backdrop}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface.card, borderColor: accent },
        ]}
      >
        <View style={styles.iconWrap}>
          <ResultIcon size={64} color={accent} />
        </View>
        <AppText variant="h1" style={[styles.headline, { color: accent }]}>
          {headline}
        </AppText>

        {!collaborative ? (
          stats ? (
            <View style={styles.record}>
              <View style={styles.recordSide}>
                <AppText variant="h2" style={{ color: GAME_YOU_COLOR }}>
                  {stats.me.wins}
                </AppText>
                <AppText variant="caption" color="secondary">
                  You
                </AppText>
              </View>
              <AppText variant="h2" color="secondary" style={styles.dash}>
                –
              </AppText>
              <View style={styles.recordSide}>
                <AppText variant="h2" style={{ color: GAME_OPPONENT_COLOR }}>
                  {stats.partner.wins}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {partnerName}
                </AppText>
              </View>
            </View>
          ) : (
            <ActivityIndicator
              color={theme.colors.accent.primary}
              style={styles.loader}
            />
          )
        ) : null}

        {!collaborative && stats && stats.me.draws > 0 ? (
          <AppText variant="caption" color="secondary" style={styles.draws}>
            {stats.me.draws} {stats.me.draws === 1 ? "draw" : "draws"} all-time
          </AppText>
        ) : null}

        <PrimaryButton
          label="Play again"
          onPress={onPlayAgain}
          loading={playAgainLoading}
          style={styles.playAgain}
        />
        <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn}>
          <AppText variant="bodySemibold" color="secondary">
            Back to games
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  iconWrap: { marginBottom: 8 },
  headline: { textAlign: "center", marginBottom: 20 },
  record: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 4,
  },
  recordSide: { alignItems: "center" },
  dash: { marginBottom: 14 },
  loader: { marginVertical: 12 },
  draws: { marginTop: 6, marginBottom: 4 },
  playAgain: { marginTop: 24, alignSelf: "stretch" },
  backBtn: { marginTop: 14, paddingVertical: 6 },
});
