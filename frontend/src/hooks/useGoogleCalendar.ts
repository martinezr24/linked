import { useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import {
  disconnectGoogle,
  fetchGoogleAuthUrl,
  fetchGoogleStatus,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { showMutationError } from "@/utils/errors";

const GOOGLE_REDIRECT = "orbit://google-calendar/connected";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleCalendar() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.googleStatus,
    queryFn: () => fetchGoogleStatus(deviceId!),
    enabled: Boolean(deviceId),
  });

  const invalidateGoogle = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.googleStatus });
    void queryClient.invalidateQueries({ queryKey: queryKeys.events });
  }, [queryClient]);

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectGoogle(deviceId!),
    onSuccess: invalidateGoogle,
    onError: () => showMutationError("Could not disconnect Google Calendar."),
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!deviceId) throw new Error("Not signed in yet.");
      const url = await fetchGoogleAuthUrl(deviceId);
      const result = await WebBrowser.openAuthSessionAsync(url, GOOGLE_REDIRECT);
      if (result.type === "cancel" || result.type === "dismiss") {
        return "cancelled" as const;
      }
      if (result.type !== "success") {
        throw new Error("Could not open Google sign-in.");
      }
      return "connected" as const;
    },
    onSuccess: (outcome) => {
      if (outcome === "connected") invalidateGoogle();
    },
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "Could not connect Google Calendar.";
      showMutationError(message);
    },
  });

  return {
    isConnected: data?.connected ?? false,
    email: data?.email,
    isLoading,
    connect: () => connectMutation.mutate(),
    disconnect: () => disconnectMutation.mutate(),
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
    invalidateGoogle,
  };
}
