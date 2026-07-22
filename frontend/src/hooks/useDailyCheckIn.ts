import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchCheckIns } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import { hapticSuccess } from "@/utils/haptics";

export function useDailyCheckIn() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const enabled = Boolean(deviceId);

  const { data: checkIns, isLoading } = useQuery({
    queryKey: queryKeys.checkIns,
    queryFn: () => fetchCheckIns(deviceId!),
    enabled,
  });

  const sendCheckIn = useMutation({
    mutationFn: async (payload: { note: string; prompt: string }) => {
      const res = await apiFetch("/api/checkins/today", deviceId!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: payload.note || undefined,
          prompt: payload.prompt || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to check in");
    },
    onSuccess: () => {
      setNote("");
      void hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.checkIns });
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgetSummary });
    },
    onError: () => showMutationError("Could not send check-in."),
  });

  return {
    checkIns,
    isLoading,
    note,
    setNote,
    sendCheckIn: (prompt: string) =>
      sendCheckIn.mutate({ note: note.trim(), prompt }),
    sending: sendCheckIn.isPending,
  };
}
