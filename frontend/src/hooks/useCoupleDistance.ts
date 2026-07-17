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

  const me: MapPerson | null =
    data && meHasCoord
      ? {
          coord: { lat: data.me.lat!, lon: data.me.lon! },
          initial: initialFromName(meName, "M"),
          avatarUrl: data.me.profilePictureUrl ?? mineAvatarUrl,
          city: data.me.city,
        }
      : null;

  const partner: MapPerson | null =
    data && partnerHasCoord
      ? {
          coord: { lat: data.partner.lat!, lon: data.partner.lon! },
          initial: initialFromName(partnerDisplay, "P"),
          avatarUrl: data.partner.profilePictureUrl ?? partnerAvatarUrl,
          city: data.partner.city,
        }
      : null;

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
    meCity: data?.me.city,
    partnerCity: data?.partner.city,
    updatedAt: data?.updatedAt,
  };
}
