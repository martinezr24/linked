import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import {
  createGridGame,
  endGridGame,
  fetchGridGame,
  joinGridGame,
  moveGridGame,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";

export function useGridGame(gameType: string) {
  const { deviceId, subscribe, sendWs } = useRelationship();
  const queryClient = useQueryClient();
  const key = queryKeys.gridGame(gameType);

  const { data: game, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchGridGame(deviceId!, gameType),
    enabled: Boolean(deviceId),
  });

  useEffect(() => {
    if (!game?.id) return;
    sendWs("GAME_JOIN", { gameId: game.id });
  }, [game?.id, sendWs]);

  useEffect(() => {
    return subscribe((msg) => {
      if (
        msg.action === "GAME_STATE" ||
        msg.action === "GAME_OVER" ||
        msg.action === "SYNC_GAMES"
      ) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      if (msg.action === "GAME_OVER") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.gridStats(gameType),
        });
      }
    });
  }, [subscribe, queryClient, key, gameType]);

  const startGame = useMutation({
    mutationFn: () => createGridGame(deviceId!, gameType),
    onSuccess: (created) => {
      queryClient.setQueryData(key, created);
      sendWs("GAME_JOIN", { gameId: created.id });
    },
  });

  const joinGame = useMutation({
    mutationFn: (gameId: string) => joinGridGame(deviceId!, gameId),
    onSuccess: (joined) => {
      queryClient.setQueryData(key, joined);
      sendWs("GAME_JOIN", { gameId: joined.id });
    },
  });

  const endGame = useMutation({
    mutationFn: (gameId: string) => endGridGame(deviceId!, gameId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });

  const makeMove = useCallback(
    (move: unknown) => {
      if (!game?.id || !game.isMyTurn) return;
      // Send over HTTP only. The server broadcasts GAME_STATE to the partner,
      // who refetches. Sending over WS as well would apply the move twice.
      moveGridGame(deviceId!, game.id, move)
        .then((updated) => {
          queryClient.setQueryData(key, updated);
        })
        .catch(() => {
          // Resync from the server on any failure.
          void queryClient.invalidateQueries({ queryKey: key });
        });
    },
    [deviceId, game, queryClient, key],
  );

  return {
    game,
    isLoading,
    startGame,
    joinGame,
    endGame,
    makeMove,
  };
}
