import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { updateProfile } from "@/api/fetchers";
import type { ProfileResponse } from "@/types";
import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useProfile } from "@/hooks/useProfile";
import { useRelationship } from "@/context/RelationshipContext";
import { syncMyPresence } from "@/utils/presenceSync";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

const PRESETS = ["Working", "Sleeping", "On a walk", "Missing you", "Busy", "Free"];

export function MyStatusCard() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const { mine, mineName } = useProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(mine?.statusMessage ?? "");
  }, [mine?.statusMessage]);

  const save = useMutation({
    mutationFn: async (message: string) => {
      const trimmed = message.trim();
      await updateProfile(deviceId!, {
        statusMessage: trimmed || undefined,
      });
      // Presence sync pulls GPS/battery/weather and can take a few seconds — run
      // it in the background so the status change itself lands instantly.
      void syncMyPresence(deviceId!, trimmed || undefined)
        .then(() => {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.partnerPresence,
          });
        })
        .catch(() => {
          // presence sync is best-effort
        });
    },
    onMutate: async (message: string) => {
      const trimmed = message.trim();
      setEditing(false);
      await queryClient.cancelQueries({ queryKey: queryKeys.profile });
      const previous = queryClient.getQueryData<ProfileResponse>(
        queryKeys.profile,
      );
      queryClient.setQueryData<ProfileResponse>(queryKeys.profile, (old) =>
        old
          ? { ...old, mine: { ...old.mine, statusMessage: trimmed || undefined } }
          : old,
      );
      return { previous };
    },
    onError: (_err, _message, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.profile, context.previous);
      }
      showMutationError("Could not update status.");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface.input,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
    },
  ];

  const current = mine?.statusMessage?.trim();

  return (
    <View style={styles.wrap}>
      <ArtifactCard category="Your status" title={mineName?.trim() || "You"} style={styles.card}>
        {!editing ? (
          <>
            <Pressable onPress={() => setEditing(true)} style={styles.statusTap}>
              <AppText variant="bodySemibold" style={styles.statusLine}>
                {current || "Tap to set what you're up to"}
              </AppText>
              <View style={styles.updateRow}>
                <AppText variant="caption" color="accent">
                  Update status
                </AppText>
                <ArrowRightIcon size={14} color={theme.colors.accent.primary} />
              </View>
            </Pressable>
            <View style={styles.quickRow}>
              {PRESETS.slice(0, 4).map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => save.mutate(preset)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.colors.surface.input,
                      borderColor: theme.colors.border.subtle,
                    },
                    current === preset && {
                      borderColor: theme.colors.accent.primary,
                    },
                  ]}
                >
                  <AppText variant="caption" color="secondary">
                    {preset}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <AppTextInput
              style={inputStyle}
              value={draft}
              onChangeText={setDraft}
              placeholder="What's going on?"
              placeholderTextColor={theme.colors.text.muted}
              maxLength={80}
              autoFocus
            />
            <View style={styles.presetWrap}>
              {PRESETS.map((preset) => (
                <Pressable
                  key={preset}
                  onPress={() => setDraft(preset)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.colors.surface.input,
                      borderColor: theme.colors.border.subtle,
                    },
                  ]}
                >
                  <AppText variant="caption" color="secondary">
                    {preset}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <View style={styles.actions}>
              <PrimaryButton
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setDraft(mine?.statusMessage ?? "");
                  setEditing(false);
                }}
                style={styles.actionBtn}
              />
              <PrimaryButton
                label={save.isPending ? "Saving…" : "Save"}
                loading={save.isPending}
                onPress={() => save.mutate(draft)}
                style={styles.actionBtn}
              />
            </View>
          </>
        )}
      </ArtifactCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  card: { flex: 1, marginBottom: 0 },
  statusTap: { gap: 6, marginBottom: 12 },
  updateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusLine: { lineHeight: 22 },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  actions: {
    gap: 8,
  },
  actionBtn: { flex: 0 },
});
