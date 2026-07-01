import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { queryKeys } from "@/api/queryKeys";
import { fetchPhotoToday } from "@/api/fetchers";
import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { ArrowRightIcon, SwapIcon } from "@/components/ui/icons";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { CouplePhotoImage } from "@/components/photos/CouplePhotoImage";
import { pickRandomCaption } from "@/constants/photoCaptions";
import { useRelationship } from "@/context/RelationshipContext";
import { uploadDailyPhoto } from "@/utils/photoUpload";
import { pickPhotoFromSource, type PhotoSource } from "@/utils/pickPhoto";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

export function DailyPhotoCard() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [caption, setCaption] = useState(() => pickRandomCaption());

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled: Boolean(deviceId),
  });

  const sendPhoto = useMutation({
    mutationFn: async (uri: string) => uploadDailyPhoto(deviceId!, uri, caption),
    onSuccess: (result) => {
      setCaption(pickRandomCaption());
      void queryClient.invalidateQueries({ queryKey: queryKeys.photoToday });
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgetSummary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.photoHistory() });
      router.push({
        pathname: "/streak",
        params: {
          celebrate: result.bothSentToday ? "1" : "0",
          streak: String(result.currentStreak),
        },
      });
    },
    onError: () => showMutationError("Could not send your photo."),
  });

  const captureAndSend = async (source: PhotoSource) => {
    try {
      const uri = await pickPhotoFromSource(source);
      if (uri) sendPhoto.mutate(uri);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "camera_denied") {
        showMutationError("Camera permission is required to take a photo.");
      } else if (code === "library_denied") {
        showMutationError("Photo library permission is required.");
      } else {
        showMutationError("Could not open the camera or library.");
      }
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.accent.primary} />
      </View>
    );
  }

  const mineSent = Boolean(data?.mine);
  const partnerSent = Boolean(data?.partner);

  return (
    <View style={styles.wrap}>
      <ArtifactCard category="Daily photo" title="Send today's moment" featured>
        <AppText variant="body" color="secondary" style={styles.hint}>
          Both send a photo to grow your streak ({data?.currentStreak ?? 0} days).
        </AppText>

        <View style={styles.previewRow}>
          <View style={styles.thumbBox}>
            {data?.mine ? (
              <CouplePhotoImage url={data.mine.imageUrl} style={styles.thumb} />
            ) : (
              <AppText variant="caption" color="muted">
                You
              </AppText>
            )}
          </View>
          <SwapIcon size={18} color={theme.colors.text.muted} />
          <View style={styles.thumbBox}>
            {data?.partner ? (
              <CouplePhotoImage url={data.partner.imageUrl} style={styles.thumb} />
            ) : (
              <AppText variant="caption" color="muted">
                Partner
              </AppText>
            )}
          </View>
        </View>

        {!mineSent ? (
          <>
            <AppTextInput
              style={[
                styles.captionInput,
                {
                  backgroundColor: theme.colors.surface.input,
                  borderColor: theme.colors.border.subtle,
                  color: theme.colors.text.primary,
                },
              ]}
              value={caption}
              onChangeText={setCaption}
              placeholder="Add a playful caption…"
              placeholderTextColor={theme.colors.text.muted}
            />
            <PrimaryButton
              label={sendPhoto.isPending ? "Sending…" : "Take photo"}
              onPress={() => void captureAndSend("camera")}
              loading={sendPhoto.isPending}
            />
            <PrimaryButton
              label="Choose from library"
              onPress={() => void captureAndSend("library")}
              variant="ghost"
              disabled={sendPhoto.isPending}
              style={styles.libraryBtn}
            />
          </>
        ) : (
          <AppText variant="bodySemibold" color="accent">
            {partnerSent
              ? "You're both in today — streak secured."
              : "Waiting for your partner's photo…"}
          </AppText>
        )}

        <Pressable onPress={() => router.push("/photos/memories")} style={styles.memories}>
          <AppText variant="bodySemibold" color="secondary">
            View memories
          </AppText>
          <ArrowRightIcon size={16} color={theme.colors.text.secondary} />
        </Pressable>
      </ArtifactCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 16 },
  loader: { padding: 24, alignItems: "center" },
  hint: { marginBottom: 12 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 12,
  },
  thumbBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: { width: 72, height: 72 },
  captionInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  libraryBtn: { marginTop: 8 },
  memories: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
