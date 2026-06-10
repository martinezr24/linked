import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { Connect4Board } from "@/games/connect4/Connect4Board";
import { useGridGame } from "@/games/useGridGame";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/theme/useTheme";

export default function Connect4Screen() {
  const theme = useTheme();
  const { partnerName } = useProfile();
  const { game, board, isLoading, startGame, joinGame, makeMove } = useGridGame();

  if (isLoading) {
    return (
      <ScreenBackground>
        <View style={styles.loader}>
          <ActivityIndicator color={theme.colors.accent.primary} />
        </View>
      </ScreenBackground>
    );
  }

  const finished = game?.status === "finished";
  const waiting = game?.status === "waiting";
  const needsJoin = waiting && !game?.playerOUserId && game?.myPlayerNumber === 0;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <PrimaryButton label="← Back" variant="ghost" onPress={() => router.back()} />

          <AppText variant="h1" style={styles.title}>
            Connect 4
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            Play in real time with {partnerName?.trim() || "your partner"}.
          </AppText>

          {!game ? (
            <PrimaryButton
              label={startGame.isPending ? "Starting…" : "Start new game"}
              loading={startGame.isPending}
              onPress={() => startGame.mutate()}
            />
          ) : null}

          {game && needsJoin ? (
            <PrimaryButton
              label={joinGame.isPending ? "Joining…" : "Join game"}
              loading={joinGame.isPending}
              onPress={() => joinGame.mutate(game.id)}
            />
          ) : null}

          {game && waiting && game.playerOUserId && game.myPlayerNumber === 1 ? (
            <AppText variant="body" color="secondary" style={styles.waiting}>
              Waiting for {partnerName?.trim() || "partner"} to join…
            </AppText>
          ) : null}

          {game && board && game.status === "active" ? (
            <Connect4Board
              state={board}
              isMyTurn={game.isMyTurn}
              myPlayerNumber={game.myPlayerNumber}
              onColumnPress={makeMove}
            />
          ) : null}

          {finished && game ? (
            <View style={styles.result}>
              <AppText variant="h2">
                {game.winnerUserId
                  ? (game.myPlayerNumber === 1 &&
                      game.winnerUserId === game.playerXUserId) ||
                    (game.myPlayerNumber === 2 &&
                      game.playerOUserId &&
                      game.winnerUserId === game.playerOUserId)
                    ? "You win!"
                    : `${partnerName?.trim() || "Partner"} wins!`
                  : "Draw!"}
              </AppText>
              <PrimaryButton
                label="Play again"
                onPress={() => startGame.mutate()}
                style={{ marginTop: 12 }}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40, gap: 16 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 8 },
  subtitle: { marginBottom: 8 },
  waiting: { textAlign: "center" },
  result: { alignItems: "center", marginTop: 16 },
});
