import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchCoupleDistance } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { useProfile } from "@/hooks/useProfile";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { haversineMeters } from "@/utils/distance";
import { initialFromName } from "@/utils/coupleNames";
import type { MapPerson } from "@/components/distance/DistanceMap";

export type CoupleDistanceView = {
  isLoading: boolean;
  /** Both partners have shared coordinates. */
  haveBoth: boolean;
  /** The current user hasn't shared a location yet. */
  meMissing: boolean;
  /** The partner hasn't shared a location yet. */
  partnerMissing: boolean;
  meters: number | null;
  me: MapPerson | null;
  partner: MapPerson | null;
  meName: string;
  partnerName: string;
  meCity?: string;
  partnerCity?: string;
  updatedAt?: string;
};

/** Loads couple coordinates and derives distance + map markers. */
export function useCoupleDistance(): CoupleDistanceView {
  const { deviceId } = useRelationship();
  const { mineName, partnerName } = useCoupleNames();
  const { mineAvatarUrl, partnerAvatarUrl } = useProfile();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.coupleDistance,
    queryFn: () => fetchCoupleDistance(deviceId!),
    enabled: Boolean(deviceId),
    refetchInterval: 60_000,
  });

  const meName = data?.me.displayName?.trim() || mineName || "You";
  const partnerDisplay =
    data?.partner.displayName?.trim() || partnerName || "Partner";

  const meHasCoord = data?.me.lat != null && data?.me.lon != null;
  const partnerHasCoord =
    data?.partner.lat != null && data?.partner.lon != null;
  const haveBoth = Boolean(meHasCoord && partnerHasCoord);

  const meLat = data?.me.lat ?? null;
  const meLon = data?.me.lon ?? null;
  const meAvatar = data?.me.profilePictureUrl ?? mineAvatarUrl;
  const meCity = data?.me.city;
  const partnerLat = data?.partner.lat ?? null;
  const partnerLon = data?.partner.lon ?? null;
  const partnerAvatar = data?.partner.profilePictureUrl ?? partnerAvatarUrl;
  const partnerCity = data?.partner.city;

  // Stable marker objects: only change when the underlying values change, so
  // unrelated re-renders (e.g. toggling mi/km) don't remount the map markers.
  const me = useMemo<MapPerson | null>(
    () =>
      meHasCoord && meLat != null && meLon != null
        ? {
            coord: { lat: meLat, lon: meLon },
            initial: initialFromName(meName, "M"),
            avatarUrl: meAvatar,
            city: meCity,
          }
        : null,
    [meHasCoord, meLat, meLon, meAvatar, meCity, meName],
  );

  const partner = useMemo<MapPerson | null>(
    () =>
      partnerHasCoord && partnerLat != null && partnerLon != null
        ? {
            coord: { lat: partnerLat, lon: partnerLon },
            initial: initialFromName(partnerDisplay, "P"),
            avatarUrl: partnerAvatar,
            city: partnerCity,
          }
        : null,
    [
      partnerHasCoord,
      partnerLat,
      partnerLon,
      partnerAvatar,
      partnerCity,
      partnerDisplay,
    ],
  );

  const meters =
    me && partner ? haversineMeters(me.coord, partner.coord) : null;

  return {
    isLoading,
    haveBoth,
    meMissing: Boolean(data) && !meHasCoord,
    partnerMissing: Boolean(data) && !partnerHasCoord,
    meters,
    me,
    partner,
    meName,
    partnerName: partnerDisplay,
    meCity,
    partnerCity,
    updatedAt: data?.updatedAt,
  };
}
