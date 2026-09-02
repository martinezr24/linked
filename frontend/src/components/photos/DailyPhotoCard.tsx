import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
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
import {
  DAILY_PHOTO_ASPECT_RATIO,
  DAILY_PHOTO_THUMB_WIDTH,
} from "@/constants/dailyPhoto";
import { pickPhotoFromLibrary } from "@/utils/pickPhoto";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";

export function DailyPhotoCard() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const [caption, setCaption] = useState(() => pickRandomCaption());

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled: Boolean(deviceId),
  });

  useEffect(() => {
    if (data?.mine) setCaption(pickRandomCaption());
  }, [data?.mine]);

  const openCamera = () => {
    router.push({
      pathname: "/photos/capture",
      params: { caption },
    });
  };

  const openLibrary = async () => {
    try {
      const uri = await pickPhotoFromLibrary();
      if (!uri) return;
      router.push({
        pathname: "/photos/capture",
        params: { caption, previewUri: uri },
      });
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "library_denied") {
        showMutationError("Photo library permission is required.");
      } else {
        showMutationError("Could not open photo library.");
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
  const streakCount = data?.currentStreak ?? 0;

  return (
    <View style={styles.wrap}>
      <ArtifactCard category="Daily photo" title="Send today's moment" featured ornament="shootingStar" style={styles.card}>
        <AppText variant="body" color="secondary" style={styles.hint}>
          {streakCount > 0
            ? `Send today's photo together to keep your ${streakCount}-day streak going.`
            : "Send a photo together each day to start your streak."}
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
            <PrimaryButton label="Take photo" onPress={openCamera} />
            <PrimaryButton
              label="Choose from library"
              onPress={() => void openLibrary()}
              variant="ghost"
              style={styles.libraryBtn}
            />
          </>
        ) : (
          <AppText
            variant="body"
            color={partnerSent ? "accent" : "secondary"}
            style={styles.status}
          >
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
  wrap: {},
  card: { marginBottom: 0 },
  loader: { padding: 24, alignItems: "center" },
  hint: { marginBottom: 12 },
  status: { marginTop: 2 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginBottom: 12,
  },
  thumbBox: {
    width: DAILY_PHOTO_THUMB_WIDTH,
    aspectRatio: DAILY_PHOTO_ASPECT_RATIO,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumb: {
    width: DAILY_PHOTO_THUMB_WIDTH,
    aspectRatio: DAILY_PHOTO_ASPECT_RATIO,
  },
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
