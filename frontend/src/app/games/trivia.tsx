import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchPhotoToday } from "@/api/fetchers";
import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { AppMark } from "@/components/ui/AppMark";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { StreakPill } from "@/components/ui/StreakPill";
import { CheckIcon, ChevronLeftIcon, CloseIcon } from "@/components/ui/icons";
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

export default function TriviaScreen() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [feedback, setFeedback] = useState<{
    roundId: string;
    selected: number;
    correct: boolean;
    correctIndex: number;
  } | null>(null);

  const { data: photoToday } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled: Boolean(deviceId),
  });
  const streak = photoToday?.currentStreak ?? 0;

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
      if (!game?.id) throw new Error("No active game");
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
      return (await res.json()) as { correct: boolean; correctIndex: number };
    },
    onError: () => showMutationError("Could not submit answer."),
  });

  const handleAnswer = (roundId: string, answerIndex: number) => {
    if (feedback || answerRound.isPending) return;
    answerRound.mutate(
      { roundId, answerIndex },
      {
        onSuccess: (result) => {
          setFeedback({
            roundId,
            selected: answerIndex,
            correct: result.correct,
            correctIndex: result.correctIndex,
          });
          setTimeout(() => {
            setFeedback(null);
            void queryClient.invalidateQueries({
              queryKey: queryKeys.triviaGame,
            });
          }, 1600);
        },
      },
    );
  };

  const pendingPartnerRound = game?.rounds.find((r) => !r.isMine && !r.answered);

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scroll}>
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
            Trivia
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            Ask questions only you two would know.
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
                <ArtifactCard
                  category="Your turn"
                  title={pendingPartnerRound.prompt}
                >
                  {pendingPartnerRound.options.map((opt, i) => {
                    const showing = feedback?.roundId === pendingPartnerRound.id;
                    const isCorrect = showing && i === feedback.correctIndex;
                    const isWrongPick =
                      showing && i === feedback.selected && !feedback.correct;
                    let backgroundColor: string = theme.colors.surface.input;
                    let borderColor: string = theme.colors.border.subtle;
                    if (isCorrect) {
                      backgroundColor = "rgba(74,222,128,0.16)";
                      borderColor = theme.colors.accent.success;
                    } else if (isWrongPick) {
                      backgroundColor = "rgba(230,57,70,0.16)";
                      borderColor = theme.colors.accent.primary;
                    }
                    return (
                      <Pressable
                        key={i}
                        disabled={showing || answerRound.isPending}
                        onPress={() => handleAnswer(pendingPartnerRound.id, i)}
                        style={[
                          styles.answerOption,
                          { backgroundColor, borderColor },
                        ]}
                      >
                        <AppText variant="bodySemibold" style={styles.answerText}>
                          {opt}
                        </AppText>
                        {isCorrect ? (
                          <CheckIcon
                            size={18}
                            color={theme.colors.accent.success}
                          />
                        ) : isWrongPick ? (
                          <CloseIcon
                            size={18}
                            color={theme.colors.accent.primary}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                  {feedback?.roundId === pendingPartnerRound.id ? (
                    <AppText
                      variant="caption"
                      color="secondary"
                      style={styles.feedbackText}
                    >
                      {feedback.correct
                        ? "Nice — you got it right!"
                        : "Not quite — the right answer is highlighted."}
                    </AppText>
                  ) : null}
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
                  disabled={
                    !prompt.trim() ||
                    options.filter((o) => o.trim()).length < 2
                  }
                  loading={addRound.isPending}
                />
              </ArtifactCard>

              {game.rounds.length > 0 ? (
                <View style={styles.history}>
                  <AppText variant="label" color="secondary">
                    ROUNDS
                  </AppText>
                  {game.rounds.map((r) => (
                    <View key={r.id} style={styles.roundLine}>
                      <AppText variant="body" color="muted" style={styles.roundText}>
                        {r.isMine ? "You asked" : "They asked"}: {r.prompt}
                      </AppText>
                      {r.answered ? (
                        <CheckIcon size={14} color={theme.colors.accent.success} />
                      ) : null}
                    </View>
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
  scroll: { padding: 20, paddingBottom: 100, gap: 16 },
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
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  optInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
  },
  optBtn: { marginTop: 8 },
  answerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  answerText: { flex: 1 },
  feedbackText: { marginTop: 10, textAlign: "center" },
  history: { marginTop: 8 },
  roundLine: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roundText: { flex: 1 },
});
