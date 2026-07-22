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
          // Scroll to top immediately; defer the refetch so the resulting
          // re-render doesn't interrupt the scroll-to-top animation (which
          // otherwise makes the screen "jump" and stop partway).
          scrollRef.current?.scrollTo({ y: 0, animated: true });
          setTimeout(() => void onRefresh(), 400);
        }
      }) as never,
    );
    return unsubscribe;
  }, [navigation, onRefresh]);

  return { scrollRef, refreshing, onRefresh };
}
