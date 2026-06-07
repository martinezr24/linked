import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchPartnerPresence } from "@/api/fetchers";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useRelationship } from "@/context/RelationshipContext";
import type { CalendarTimezoneMode } from "@/types";
import {
  loadCalendarTimezonePreference,
  saveCalendarTimezonePreference,
} from "@/utils/calendarTimezoneStorage";
import {
  formatTimezoneShort,
  getDeviceIANATimezone,
} from "@/utils/dates";

export function useCalendarTimezone() {
  const { deviceId } = useRelationship();
  const { mineName, partnerName } = useCoupleNames();
  const [mode, setModeState] = useState<CalendarTimezoneMode>("device");
  const [customTz, setCustomTzState] = useState("UTC");
  const [ready, setReady] = useState(false);

  const { data: partnerPresence } = useQuery({
    queryKey: queryKeys.partnerPresence,
    queryFn: () => fetchPartnerPresence(deviceId!),
    enabled: Boolean(deviceId),
    staleTime: 60_000,
  });

  useEffect(() => {
    loadCalendarTimezonePreference().then((pref) => {
      setModeState(pref.mode);
      setCustomTzState(pref.customTz);
      setReady(true);
    });
  }, []);

  const deviceTz = useMemo(() => getDeviceIANATimezone(), []);
  const partnerTz = partnerPresence?.timezone?.trim() || null;

  const activeTimezone = useMemo(() => {
    if (mode === "partner" && partnerTz) return partnerTz;
    if (mode === "custom") return customTz;
    return deviceTz;
  }, [mode, partnerTz, customTz, deviceTz]);

  const partnerUnavailable = mode === "partner" && !partnerTz;

  const setMode = useCallback(async (next: CalendarTimezoneMode) => {
    setModeState(next);
    await saveCalendarTimezonePreference({ mode: next, customTz });
  }, [customTz]);

  const setCustomTz = useCallback(async (tz: string) => {
    setCustomTzState(tz);
    setModeState("custom");
    await saveCalendarTimezonePreference({ mode: "custom", customTz: tz });
  }, []);

  const modeLabel = useMemo(() => {
    switch (mode) {
      case "device":
        return mineName?.trim() ? `${mineName}'s time` : "My time";
      case "partner":
        return partnerName?.trim()
          ? `${partnerName}'s time`
          : "Partner's time";
      case "custom":
        return "Other";
    }
  }, [mode, mineName, partnerName]);

  const activeLabel = formatTimezoneShort(activeTimezone);

  return {
    ready,
    mode,
    customTz,
    deviceTz,
    partnerTz,
    activeTimezone,
    activeLabel,
    modeLabel,
    partnerUnavailable,
    setMode,
    setCustomTz,
  };
}
