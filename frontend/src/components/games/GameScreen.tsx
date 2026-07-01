import { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchGridStats, fetchPhotoToday } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { AppMark } from "@/components/ui/AppMark";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { StreakPill } from "@/components/ui/StreakPill";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { GameResultOverlay } from "@/components/games/GameResultOverlay";
import { getGameMeta } from "@/games/catalog";
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

  const { data: stats } = useQuery({
    queryKey: queryKeys.gridStats(gameType),
    queryFn: () => fetchGridStats(deviceId!, gameType),
    enabled: Boolean(deviceId),
  });
  const collaborative = gameType === "wordguess";

  const partner = partnerName?.trim() || "your partner";
  const Renderer = getGameRenderer(gameType);

  const finished = game?.status === "finished";
  const active = game?.status === "active" || game?.status === "waiting";
  const isPlayer = (game?.myPlayerNumber ?? 0) > 0;
  const hasOpponent = Boolean(game?.playerOUserId);
  // The partner opens a game they didn't create -> auto-join it.
  const canAutoJoin = Boolean(game) && !finished && !isPlayer && !hasOpponent;
  // The creator is in an active game but the partner hasn't joined yet.
  const awaitingOpponent =
    Boolean(game) && active && isPlayer && !hasOpponent;

  // Auto-join once per game id.
  const joinedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!game?.id) return;
    if (canAutoJoin && joinedRef.current !== game.id && !joinGame.isPending) {
      joinedRef.current = game.id;
      joinGame.mutate(game.id);
    }
  }, [game?.id, canAutoJoin, joinGame]);

  const header = (
    <>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.back}>
          <ChevronLeftIcon size={30} color={theme.colors.text.primary} />
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
  if (active && game && isPlayer) {
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

          {awaitingOpponent ? (
            <AppText variant="caption" color="secondary" style={styles.waiting}>
              {partner} can jump in anytime — go ahead and play!
            </AppText>
          ) : null}

          {!active && stats ? (
            <View
              style={[
                styles.scoreCard,
                { backgroundColor: theme.colors.surface.card },
              ]}
            >
              <AppText variant="caption" color="secondary" style={styles.scoreTitle}>
                All-time
              </AppText>
              {collaborative ? (
                <AppText variant="h2" style={styles.scoreSolved}>
                  {stats.me.wins + stats.partner.wins} solved together
                </AppText>
              ) : (
                <View style={styles.scoreRow}>
                  <View style={styles.scoreSide}>
                    <AppText variant="h1" style={{ color: mineColor }}>
                      {stats.me.wins}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      You
                    </AppText>
                  </View>
                  <AppText variant="h2" color="secondary" style={styles.scoreDash}>
                    –
                  </AppText>
                  <View style={styles.scoreSide}>
                    <AppText variant="h1" style={{ color: partnerColor }}>
                      {stats.partner.wins}
                    </AppText>
                    <AppText variant="caption" color="secondary">
                      {partner}
                    </AppText>
                  </View>
                </View>
              )}
              {!collaborative && stats.me.draws > 0 ? (
                <AppText variant="caption" color="secondary" style={styles.scoreDraws}>
                  {stats.me.draws} {stats.me.draws === 1 ? "draw" : "draws"}
                </AppText>
              ) : null}
            </View>
          ) : null}

          {isLoading || (canAutoJoin && !finished) ? (
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

          {active && game && isPlayer && Renderer ? (
            <View style={styles.boardWrap}>
              <Renderer
                state={game.boardState}
                isMyTurn={game.isMyTurn}
                myPlayerNumber={game.myPlayerNumber}
                onMove={makeMove}
              />
            </View>
          ) : null}

          {active && game && isPlayer ? (
            <PrimaryButton
              label="End game"
              variant="ghost"
              onPress={() => endGame.mutate(game.id)}
              loading={endGame.isPending}
              style={styles.endBtn}
            />
          ) : null}
        </ScrollView>

        {finished && game ? (
          <GameResultOverlay
            gameType={gameType}
            game={game}
            partnerName={partner}
            onPlayAgain={() => {
              joinedRef.current = null;
              startGame.mutate();
            }}
            onBack={() => router.back()}
            playAgainLoading={startGame.isPending}
          />
        ) : null}
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
  scoreCard: {
    alignSelf: "center",
    minWidth: 220,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  scoreTitle: { textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  scoreSolved: { textAlign: "center" },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  scoreSide: { alignItems: "center" },
  scoreDash: { marginBottom: 14 },
  scoreDraws: { marginTop: 8 },
  boardWrap: { alignItems: "center", marginTop: 8 },
  endBtn: { marginTop: 8 },
});
