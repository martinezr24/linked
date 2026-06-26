import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchPhotoToday } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { AppMark } from "@/components/ui/AppMark";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { StreakPill } from "@/components/ui/StreakPill";
import { getGameMeta, resolveResult } from "@/games/catalog";
import "@/games/register";
import { getGameRenderer } from "@/games/registry";
import { useGridGame } from "@/games/useGridGame";
import { useProfile } from "@/hooks/useProfile";
import { useRelationship } from "@/context/RelationshipContext";
import { useTheme } from "@/theme/useTheme";

type Props = { gameType: string };

export function GameScreen({ gameType }: Props) {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const { partnerName, mineColor, partnerColor } = useProfile();
  const meta = getGameMeta(gameType);
  const { game, isLoading, startGame, joinGame, endGame, makeMove } =
    useGridGame(gameType);

  const { data: photoToday } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled: Boolean(deviceId),
  });
  const streak = photoToday?.currentStreak ?? 0;

  const partner = partnerName?.trim() || "your partner";
  const Renderer = getGameRenderer(gameType);

  const finished = game?.status === "finished";
  const waiting = game?.status === "waiting";
  const active = game?.status === "active";
  const needsJoin = waiting && game?.myPlayerNumber === 0;

  const header = (
    <>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <AppText style={styles.backChevron}>‹</AppText>
        </Pressable>
        <AppMark size={28} />
        <View style={styles.topRight}>
          <StreakPill count={streak} />
        </View>
      </View>
      <AppText variant="h1" style={styles.title}>
        {meta?.title ?? "Game"}
      </AppText>
    </>
  );

  let turnLabel: string | null = null;
  let turnColor: string = theme.colors.text.muted;
  if (active && game) {
    if (game.isMyTurn) {
      turnLabel = "Your turn";
      turnColor = mineColor;
    } else {
      turnLabel = `${partner}'s turn`;
      turnColor = partnerColor;
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {header}

          {turnLabel ? (
            <View style={styles.turnRow}>
              <View style={[styles.turnDot, { backgroundColor: turnColor }]} />
              <AppText variant="bodySemibold">{turnLabel}</AppText>
            </View>
          ) : (
            <AppText variant="body" color="secondary" style={styles.subtitle}>
              {meta?.subtitle}
            </AppText>
          )}

          {isLoading ? (
            <ActivityIndicator
              color={theme.colors.accent.primary}
              style={styles.loader}
            />
          ) : null}

          {!isLoading && !game ? (
            <PrimaryButton
              label={startGame.isPending ? "Starting…" : "Start new game"}
              loading={startGame.isPending}
              onPress={() => startGame.mutate()}
            />
          ) : null}

          {needsJoin && game ? (
            <PrimaryButton
              label={joinGame.isPending ? "Joining…" : `Join ${partner}'s game`}
              loading={joinGame.isPending}
              onPress={() => joinGame.mutate(game.id)}
            />
          ) : null}

          {waiting && game && game.myPlayerNumber === 1 ? (
            <AppText variant="body" color="secondary" style={styles.waiting}>
              Waiting for {partner} to join…
            </AppText>
          ) : null}

          {active && game && Renderer ? (
            <View style={styles.boardWrap}>
              <Renderer
                state={game.boardState}
                isMyTurn={game.isMyTurn}
                myPlayerNumber={game.myPlayerNumber}
                onMove={makeMove}
              />
            </View>
          ) : null}

          {finished && game ? (
            <View style={styles.result}>
              <AppText variant="h2" style={styles.resultText}>
                {resolveResult({ game, partnerName: partner })}
              </AppText>
              <PrimaryButton
                label="Play again"
                onPress={() => startGame.mutate()}
                style={styles.replay}
              />
            </View>
          ) : null}

          {game && !finished ? (
            <PrimaryButton
              label="End game"
              variant="ghost"
              onPress={() => endGame.mutate(game.id)}
              loading={endGame.isPending}
              style={styles.endBtn}
            />
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: { width: 40 },
  backChevron: { fontSize: 34, lineHeight: 34, color: "#F5F0F1" },
  topRight: { width: 40, alignItems: "flex-end" },
  title: { textAlign: "center" },
  subtitle: { textAlign: "center" },
  turnRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  turnDot: { width: 16, height: 16, borderRadius: 8 },
  loader: { marginTop: 24 },
  waiting: { textAlign: "center" },
  boardWrap: { alignItems: "center", marginTop: 8 },
  result: { alignItems: "center", marginTop: 8 },
  resultText: { textAlign: "center" },
  replay: { marginTop: 12 },
  endBtn: { marginTop: 8 },
});
