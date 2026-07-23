import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { queryKeys } from "@/api/queryKeys";
import { fetchPhotoHistory, reactToPhoto } from "@/api/fetchers";
import { CouplePhotoImage } from "@/components/photos/CouplePhotoImage";
import {
  ReactionPicker,
  ReactionSticker,
  type ReactionType,
} from "@/components/photos/PhotoReactions";
import { AppText } from "@/components/ui/AppText";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { useRelationship } from "@/context/RelationshipContext";
import { formatMMDDYYYY } from "@/utils/dates";
import { useTheme } from "@/theme/useTheme";
import type { DailyPhoto, PhotoDayGroup } from "@/types";

function PhotoTile({
  label,
  photo,
  onPress,
}: {
  label: string;
  photo: DailyPhoto | null;
  onPress: (p: DailyPhoto) => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      style={[
        styles.tile,
        { backgroundColor: theme.colors.surface.cardElevated },
      ]}
      onPress={() => photo && onPress(photo)}
      disabled={!photo}
    >
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      {photo ? (
        <View style={styles.tileImgWrap}>
          <CouplePhotoImage url={photo.imageUrl} style={styles.tileImg} />
          {photo.reaction ? (
            <View style={styles.tileBadge}>
              <ReactionSticker type={photo.reaction as ReactionType} size={18} />
            </View>
          ) : null}
        </View>
      ) : (
        <AppText variant="caption" color="muted" style={styles.empty}>
          —
        </AppText>
      )}
    </Pressable>
  );
}

function DayRow({
  day,
  onPhotoPress,
}: {
  day: PhotoDayGroup;
  onPhotoPress: (p: DailyPhoto) => void;
}) {
  return (
    <View style={styles.dayRow}>
      <AppText variant="label" color="secondary" style={styles.date}>
        {formatMMDDYYYY(day.photoDate)}
      </AppText>
      <View style={styles.tiles}>
        <PhotoTile label="You" photo={day.mine} onPress={onPhotoPress} />
        <PhotoTile label="Partner" photo={day.partner} onPress={onPhotoPress} />
      </View>
    </View>
  );
}

export default function PhotoMemoriesScreen() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [lightbox, setLightbox] = useState<DailyPhoto | null>(null);
  const [reaction, setReaction] = useState<ReactionType | "">("");

  useEffect(() => {
    setReaction((lightbox?.reaction as ReactionType) ?? "");
  }, [lightbox]);

  const reactMutation = useMutation({
    mutationFn: (vars: { photoId: string; reaction: ReactionType | "" }) =>
      reactToPhoto(deviceId!, vars.photoId, vars.reaction),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.photoHistory() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.photoToday });
    },
  });

  const pickReaction = (next: ReactionType | "") => {
    if (!lightbox || !deviceId) return;
    setReaction(next);
    reactMutation.mutate({ photoId: lightbox.id, reaction: next });
  };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.photoHistory(),
    queryFn: ({ pageParam }) =>
      fetchPhotoHistory(deviceId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(deviceId),
  });

  const days = data?.pages.flatMap((p) => p.days) ?? [];

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeftIcon size={18} color={theme.colors.accent.primary} />
            <AppText variant="bodySemibold" color="accent">
              Back
            </AppText>
          </Pressable>
          <AppText variant="h2">Memories</AppText>
        </View>

        {isLoading ? (
          <ActivityIndicator
            color={theme.colors.accent.primary}
            style={styles.loader}
          />
        ) : days.length === 0 ? (
          <AppText variant="body" color="muted" style={styles.emptyList}>
            Your first shared photos will show up here.
          </AppText>
        ) : (
          <FlatList
            data={days}
            keyExtractor={(d) => d.photoDate}
            renderItem={({ item }) => (
              <DayRow day={item} onPhotoPress={setLightbox} />
            )}
            contentContainerStyle={styles.list}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
            }}
          />
        )}

        <Modal visible={lightbox !== null} transparent animationType="fade">
          <Pressable style={styles.modalBg} onPress={() => setLightbox(null)}>
            <View
              style={[
                styles.modalCard,
                { backgroundColor: theme.colors.surface.card },
              ]}
            >
              {lightbox ? (
                <>
                  <CouplePhotoImage url={lightbox.imageUrl} style={styles.fullImg} />
                  {lightbox.caption ? (
                    <AppText variant="body" style={styles.caption}>
                      {lightbox.caption}
                    </AppText>
                  ) : null}
                  <AppText variant="caption" color="muted">
                    {formatMMDDYYYY(lightbox.photoDate)}
                  </AppText>
                  {lightbox.isMine ? (
                    lightbox.reaction ? (
                      <View style={styles.reactionRow}>
                        <ReactionSticker
                          type={lightbox.reaction as ReactionType}
                          size={30}
                        />
                        <AppText variant="caption" color="secondary">
                          Your partner reacted
                        </AppText>
                      </View>
                    ) : null
                  ) : (
                    <View style={styles.reactBlock}>
                      <AppText
                        variant="caption"
                        color="muted"
                        style={styles.reactHint}
                      >
                        Tap to react
                      </AppText>
                      <ReactionPicker
                        value={reaction || null}
                        onPick={pickReaction}
                      />
                    </View>
                  )}
                </>
              ) : null}
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  loader: { marginTop: 40 },
  emptyList: { padding: 20, textAlign: "center" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  dayRow: { marginBottom: 20 },
  date: { marginBottom: 8 },
  tiles: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    borderRadius: 12,
    padding: 8,
    minHeight: 100,
  },
  tileImg: {
    width: "100%",
    height: 80,
    borderRadius: 8,
  },
  tileImgWrap: {
    position: "relative",
    marginTop: 6,
  },
  tileBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 10,
    padding: 2,
  },
  empty: { marginTop: 24, textAlign: "center" },
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  fullImg: {
    width: "100%",
    height: 320,
    borderRadius: 12,
    marginBottom: 12,
  },
  caption: { marginBottom: 8, textAlign: "center" },
  reactBlock: { marginTop: 16, alignItems: "center", gap: 8 },
  reactHint: {},
  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
});
