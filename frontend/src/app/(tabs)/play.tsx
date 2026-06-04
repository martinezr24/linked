import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

type TriviaRound = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex?: number;
  partnerAnswerIndex?: number;
  isMine: boolean;
  answered: boolean;
};

type TriviaGame = {
  id: string;
  status: string;
  scores: Record<string, number>;
  rounds: TriviaRound[];
};

export default function PlayScreen() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const { data: game, isLoading } = useQuery({
    queryKey: queryKeys.triviaGame,
    queryFn: async () => {
      const res = await apiFetch("/api/games/trivia/active", deviceId!);
      if (!res.ok) throw new Error("Failed to load game");
      return res.json() as Promise<TriviaGame | null>;
    },
    enabled: Boolean(deviceId),
  });

  const startGame = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/games/trivia/active", deviceId!, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start");
      return res.json() as Promise<TriviaGame>;
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.triviaGame }),
    onError: () => showMutationError("Could not start a game."),
  });

  const addRound = useMutation({
    mutationFn: async () => {
      if (!game?.id) return;
      const res = await apiFetch(
        `/api/games/trivia/${game.id}/rounds`,
        deviceId!,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: prompt.trim(),
            options: options.map((o) => o.trim()).filter(Boolean),
            correctIndex,
          }),
        },
      );
      if (!res.ok) throw new Error("Failed to add round");
      return res.json();
    },
    onSuccess: () => {
      setPrompt("");
      setOptions(["", "", "", ""]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.triviaGame });
    },
    onError: () => showMutationError("Could not add question."),
  });

  const answerRound = useMutation({
    mutationFn: async ({
      roundId,
      answerIndex,
    }: {
      roundId: string;
      answerIndex: number;
    }) => {
      if (!game?.id) return;
      const res = await apiFetch(
        `/api/games/trivia/${game.id}/rounds/${roundId}/answer`,
        deviceId!,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answerIndex }),
        },
      );
      if (!res.ok) throw new Error("Failed to answer");
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.triviaGame }),
    onError: () => showMutationError("Could not submit answer."),
  });

  const pendingPartnerRound = game?.rounds.find(
    (r) => !r.isMine && !r.answered,
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <AppText variant="h1" style={styles.title}>
            Play
          </AppText>
          <AppText variant="body" color="secondary" style={styles.sub}>
            Low-pressure trivia — take turns writing questions for each other.
          </AppText>

          {isLoading ? (
            <ActivityIndicator color={theme.colors.accent.primary} />
          ) : !game ? (
            <ArtifactCard category="Partner trivia" title="Start a game">
              <PrimaryButton
                label="New trivia game"
                onPress={() => startGame.mutate()}
                loading={startGame.isPending}
              />
            </ArtifactCard>
          ) : (
            <>
              {pendingPartnerRound ? (
                <ArtifactCard category="Your turn" title={pendingPartnerRound.prompt}>
                  {pendingPartnerRound.options.map((opt, i) => (
                    <PrimaryButton
                      key={i}
                      label={opt}
                      onPress={() =>
                        answerRound.mutate({
                          roundId: pendingPartnerRound.id,
                          answerIndex: i,
                        })
                      }
                      style={styles.optBtn}
                      variant="ghost"
                    />
                  ))}
                </ArtifactCard>
              ) : null}

              <ArtifactCard category="Write a question" title="For your partner">
                <AppTextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface.input,
                      borderColor: theme.colors.border.subtle,
                      color: theme.colors.text.primary,
                    },
                  ]}
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="Ask something only they'd know…"
                  placeholderTextColor={theme.colors.text.muted}
                />
                {options.map((opt, i) => (
                  <View key={i} style={styles.optRow}>
                    <TouchableOpacity
                      onPress={() => setCorrectIndex(i)}
                      style={[
                        styles.radio,
                        {
                          borderColor:
                            correctIndex === i
                              ? theme.colors.accent.primary
                              : theme.colors.border.subtle,
                        },
                      ]}
                    />
                    <AppTextInput
                      style={[
                        styles.optInput,
                        {
                          backgroundColor: theme.colors.surface.input,
                          borderColor: theme.colors.border.subtle,
                          color: theme.colors.text.primary,
                        },
                      ]}
                      value={opt}
                      onChangeText={(t) => {
                        const next = [...options];
                        next[i] = t;
                        setOptions(next);
                      }}
                      placeholder={`Option ${i + 1}`}
                      placeholderTextColor={theme.colors.text.muted}
                    />
                  </View>
                ))}
                <PrimaryButton
                  label="Send question"
                  onPress={() => addRound.mutate()}
                  disabled={!prompt.trim() || options.filter((o) => o.trim()).length < 2}
                  loading={addRound.isPending}
                />
              </ArtifactCard>

              {game.rounds.length > 0 ? (
                <View style={styles.history}>
                  <AppText variant="label" color="secondary">
                    ROUNDS
                  </AppText>
                  {game.rounds.map((r) => (
                    <AppText key={r.id} variant="body" color="muted" style={styles.roundLine}>
                      {r.isMine ? "You asked" : "They asked"}: {r.prompt}
                      {r.answered ? " ✓" : ""}
                    </AppText>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  title: { marginBottom: 8 },
  sub: { marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  optRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  optInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  optBtn: { marginTop: 8 },
  history: { marginTop: 20 },
  roundLine: { marginTop: 6 },
});
