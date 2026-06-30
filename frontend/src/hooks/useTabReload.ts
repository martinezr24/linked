import { useCallback, useEffect, useRef, useState } from "react";
import type { ScrollView } from "react-native";
import { useScrollToTop } from "@react-navigation/native";
import { useNavigation } from "expo-router";

/**
 * Instagram-style tab reload behaviour for a tab screen's scroll view.
 *
 * - Tapping the already-focused tab scrolls to top (via useScrollToTop) and
 *   refetches the screen's data.
 * - Returns { refreshing, onRefresh } to wire a pull-to-refresh RefreshControl.
 *
 * Spread the returned `scrollRef` onto the screen's <ScrollView ref={scrollRef} />.
 */
export function useTabReload(onReload: () => Promise<unknown> | void) {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onReload();
    } finally {
      setRefreshing(false);
    }
  }, [onReload]);

  const navigation = useNavigation();
  useEffect(() => {
    // "tabPress" is emitted by the bottom-tabs navigator; the typed event map
    // from expo-router's useNavigation doesn't include it, so cast the key.
    const unsubscribe = navigation.addListener(
      "tabPress" as never,
      (() => {
        if (navigation.isFocused()) {
          void onRefresh();
        }
      }) as never,
    );
    return unsubscribe;
  }, [navigation, onRefresh]);

  return { scrollRef, refreshing, onRefresh };
}
