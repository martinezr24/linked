import { Linking } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import {
  disconnectGoogle,
  fetchGoogleAuthUrl,
  fetchGoogleStatus,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";

/**
 * Hook for managing a user's Google Calendar connection.
 *
 * - `isConnected`  whether the current user has a linked Google account
 * - `email`        the connected Google account email (if connected)
 * - `connect()`    opens the Google OAuth consent page in the system browser
 * - `disconnect()` removes the stored Google token
 * - `isLoading`    true while the status is being fetched
 */
export function useGoogleCalendar() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.googleStatus,
    queryFn: () => fetchGoogleStatus(deviceId!),
    enabled: Boolean(deviceId),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnectGoogle(deviceId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.googleStatus });
    },
  });

  const connect = async () => {
    if (!deviceId) return;
    const url = await fetchGoogleAuthUrl(deviceId);
    await Linking.openURL(url);
  };

  return {
    isConnected: data?.connected ?? false,
    email: data?.email,
    isLoading,
    connect,
    disconnect: () => disconnectMutation.mutate(),
    isDisconnecting: disconnectMutation.isPending,
  };
}
