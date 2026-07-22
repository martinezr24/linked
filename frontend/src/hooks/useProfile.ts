import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchProfile, updateProfile } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { getMyDisplayName } from "@/utils/coupleNames";

export function useProfile() {
  const { deviceId } = useRelationship();
  const migratedRef = useRef(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => fetchProfile(deviceId!),
    enabled: Boolean(deviceId),
  });

  useEffect(() => {
    if (!deviceId || !data || migratedRef.current) return;
    if (data.mine.displayName?.trim()) {
      migratedRef.current = true;
      return;
    }
    void (async () => {
      const local = await getMyDisplayName();
      if (!local?.trim()) {
        migratedRef.current = true;
        return;
      }
      migratedRef.current = true;
      await updateProfile(deviceId, { displayName: local.trim() });
      void refetch();
    })();
  }, [deviceId, data, refetch]);

  return {
    profile: data,
    mine: data?.mine,
    partner: data?.partner,
    isLoading,
    refetch,
    mineName: data?.mine.displayName ?? null,
    partnerName: data?.partner?.displayName ?? null,
    mineColor: data?.mine.calendarColor ?? "#C44B6E",
    partnerColor: data?.partner?.calendarColor ?? "#5B7FD4",
    sharedColor: data?.sharedColor,
    mineAvatarUrl: data?.mine.profilePictureUrl,
    partnerAvatarUrl: data?.partner?.profilePictureUrl,
  };
}
