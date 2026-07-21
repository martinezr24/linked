import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  loadDistanceUnit,
  saveDistanceUnit,
} from "@/utils/distanceUnitStorage";
import type { DistanceUnit } from "@/utils/distance";

const UNIT_KEY = ["distanceUnit"] as const;

/**
 * App-wide distance unit (mi/km), persisted and shared across screens via the
 * query cache so changing it anywhere (home card or detail) updates everywhere.
 */
export function useDistanceUnit() {
  const queryClient = useQueryClient();
  const { data: unit = "mi" } = useQuery({
    queryKey: UNIT_KEY,
    queryFn: loadDistanceUnit,
    staleTime: Infinity,
  });

  const setUnit = useCallback(
    (next: DistanceUnit) => {
      queryClient.setQueryData(UNIT_KEY, next);
      void saveDistanceUnit(next);
    },
    [queryClient],
  );

  const toggleUnit = useCallback(() => {
    setUnit(unit === "mi" ? "km" : "mi");
  }, [unit, setUnit]);

  return { unit, setUnit, toggleUnit };
}
