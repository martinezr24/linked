import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { queryKeys } from "@/api/queryKeys";
import { useRelationship } from "@/context/RelationshipContext";
import { uploadDailyPhoto } from "@/utils/photoUpload";
import { showMutationError } from "@/utils/errors";

export function useSendDailyPhoto(
  caption: string,
  options?: { onSent?: () => void },
) {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uri: string) => uploadDailyPhoto(deviceId!, uri, caption),
    onSuccess: (result) => {
      options?.onSent?.();
      void queryClient.invalidateQueries({ queryKey: queryKeys.photoToday });
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgetSummary });
      void queryClient.invalidateQueries({ queryKey: queryKeys.photoHistory() });
      router.replace({
        pathname: "/streak",
        params: {
          celebrate: result.bothSentToday ? "1" : "0",
          streak: String(result.currentStreak),
        },
      });
    },
    onError: () => showMutationError("Could not send your photo."),
  });
}
