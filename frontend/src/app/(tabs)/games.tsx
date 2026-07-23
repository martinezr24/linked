import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchGridGame, fetchGridStats } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { MountFade, PressableScale } from "@/components/ui/motion";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { GAMES, type GameMeta } from "@/games/catalog";
import { useProfile } from "@/hooks/useProfile";
import { useTabReload } from "@/hooks/useTabReload";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";

type Status = { label: string; active: boolean };

function StatusBadge({ status }: { status: Status }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: status.active
            ? theme.colors.accent.primaryMuted
            : theme.colors.surface.cardElevated,
          borderColor: status.active
            ? theme.colors.accent.primary
            : theme.colors.border.subtle,
        },
      ]}
    >
      <AppText
        variant="label"
        color={status.active ? "primary" : "muted"}
      >
        {status.label}
      </AppText>
    </View>
  );
}

function GameCard({
  meta,
  status,
  record,
}: {
  meta: GameMeta;
  status: Status;
  record?: string;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      onPress={() => router.push(meta.route as Href)}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <View
        style={[
          styles.emojiWrap,
          { backgroundColor: theme.colors.surface.cardElevated },
        ]}
      >
        <meta.icon size={26} color={theme.colors.accent.primary} />
      </View>
      <View style={styles.cardBody}>
        <AppText variant="bodySemibold">{meta.title}</AppText>
        <AppText variant="body" color="secondary" style={styles.cardSub}>
          {meta.subtitle}
        </AppText>
        {record ? (
          <AppText variant="caption" color="muted" style={styles.record}>
            {record}
          </AppText>
        ) : null}
      </View>
      <StatusBadge status={status} />
    </PressableScale>
  );
}

function GridGameCard({ meta }: { meta: GameMeta }) {
  const { deviceId } = useRelationship();
  const { partnerName } = useProfile();
  const partner = partnerName?.trim() || "Partner";
  const { data: game } = useQuery({
    queryKey: queryKeys.gridGame(meta.type),
    queryFn: () => fetchGridGame(deviceId!, meta.type),
    enabled: Boolean(deviceId),
  });
  const { data: stats } = useQuery({
    queryKey: queryKeys.gridStats(meta.type),
    queryFn: () => fetchGridStats(deviceId!, meta.type),
    enabled: Boolean(deviceId),
  });

  let status: Status = { label: "Play", active: false };
  if (game && game.status === "active") {
    const partnerStartedNew =
      game.myPlayerNumber === 0 && !game.playerOUserId;
    if (partnerStartedNew) {
      status = { label: "New game!", active: true };
    } else {
      status = game.isMyTurn
        ? { label: "Your turn", active: true }
        : { label: "In play", active: false };
    }
  } else if (game && game.status === "waiting") {
    status = { label: "New game!", active: game.myPlayerNumber === 0 };
  } else if (game && game.status === "finished" && meta.type === "wordguess") {
    // The collaborative word guess is solved together — surface that.
    status = { label: "Solved!", active: false };
  }

  let record: string | undefined;
  if (
    stats &&
    meta.type !== "wordguess" &&
    stats.me.wins + stats.partner.wins + stats.me.draws > 0
  ) {
    record = `You ${stats.me.wins} – ${stats.partner.wins} ${partner}`;
  }

  return <GameCard meta={meta} status={status} record={record} />;
}

function TriviaGameCard({ meta }: { meta: GameMeta }) {
  const { deviceId } = useRelationship();
  const { data: game } = useQuery({
    queryKey: queryKeys.triviaGame,
    queryFn: async () => {
      const res = await apiFetch("/api/games/trivia/active", deviceId!);
      if (!res.ok) throw new Error("Failed to load game");
      return res.json() as Promise<{
        rounds: { isMine: boolean; answered: boolean }[];
      } | null>;
    },
    enabled: Boolean(deviceId),
  });

  let status: Status = { label: "Play", active: false };
  if (game) {
    const pending = game.rounds?.some((r) => !r.isMine && !r.answered);
    status = pending
      ? { label: "Your turn", active: true }
      : { label: "In play", active: false };
  }
  return <GameCard meta={meta} status={status} />;
}

export default function GamesScreen() {
  const queryClient = useQueryClient();
  const { scrollRef, refreshing, onRefresh } = useTabReload(() =>
    queryClient.invalidateQueries(),
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text.secondary}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <AppText variant="h1">Games</AppText>
              <AppText variant="body" color="secondary" style={styles.subtitle}>
                Play together, wherever you are.
              </AppText>
            </View>
          </View>

          {GAMES.map((meta, i) => (
            <MountFade key={meta.type} index={i}>
              {meta.kind === "trivia" ? (
                <TriviaGameCard meta={meta} />
              ) : (
                <GridGameCard meta={meta} />
              )}
            </MountFade>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100, gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerText: { flex: 1 },
  subtitle: { marginTop: 4 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1 },
  cardSub: { marginTop: 2 },
  record: { marginTop: 4 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
