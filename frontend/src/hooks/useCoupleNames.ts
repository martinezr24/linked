import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";

import {
  getMyDisplayName,
  getPartnerDisplayName,
} from "@/utils/coupleNames";

export function useCoupleNames() {
  const [mineName, setMineName] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const reload = useCallback(() => {
    Promise.all([getMyDisplayName(), getPartnerDisplayName()]).then(
      ([mine, partner]) => {
        setMineName(mine);
        setPartnerName(partner);
        setReady(true);
      },
    );
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { mineName, partnerName, ready, setMineName, setPartnerName, reload };
}
