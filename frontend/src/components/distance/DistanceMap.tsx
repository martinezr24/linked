import { memo, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import { DistanceMarker } from "./DistanceMarker";
import { DARK_MAP_STYLE } from "./darkMapStyle";
import { HeartIcon } from "@/components/ui/icons";
import { midpoint, regionForCoords, type LatLng } from "@/utils/distance";
import { colors } from "@/theme/tokens";

export type MapPerson = {
  coord: LatLng;
  initial: string;
  avatarUrl?: string;
  city?: string;
};

type Props = {
  me: MapPerson;
  partner: MapPerson;
  /** Enables pan/zoom. When false the map is a static, tap-through preview. */
  interactive?: boolean;
  /** Float each user's city name on the map, just below their avatar. */
  showCityLabels?: boolean;
  style?: StyleProp<ViewStyle>;
};

const EDGE_PADDING = { top: 64, right: 64, bottom: 64, left: 64 };

function DistanceMapComponent({
  me,
  partner,
  interactive = false,
  showCityLabels = true,
  style,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const fitted = useRef(false);
  // Markers render custom views (avatars + SVG heart); keep tracking briefly so
  // the async avatar images paint, then stop for performance.
  const [tracks, setTracks] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setTracks(false), 2500);
    return () => clearTimeout(t);
  }, [me.avatarUrl, partner.avatarUrl]);

  const meCoord = { latitude: me.coord.lat, longitude: me.coord.lon };
  const partnerCoord = {
    latitude: partner.coord.lat,
    longitude: partner.coord.lon,
  };
  const mid = midpoint(me.coord, partner.coord);

  // Frame both markers once. Guarding prevents re-fitting (which would fight
  // the user's own pan/zoom on the interactive map).
  const fitBounds = () => {
    if (fitted.current) return;
    fitted.current = true;
    mapRef.current?.fitToCoordinates([meCoord, partnerCoord], {
      edgePadding: EDGE_PADDING,
      animated: false,
    });
  };

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        customMapStyle={Platform.OS === "android" ? [...DARK_MAP_STYLE] : undefined}
        userInterfaceStyle="dark"
        initialRegion={regionForCoords(me.coord, partner.coord)}
        onMapReady={fitBounds}
        onLayout={fitBounds}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsCompass={false}
        showsPointsOfInterest={false}
        showsMyLocationButton={false}
        pointerEvents={interactive ? undefined : "none"}
      >
        <Polyline
          coordinates={[meCoord, partnerCoord]}
          strokeColor={colors.accent.primary}
          strokeWidth={2.5}
          lineDashPattern={[6, 7]}
          lineCap="round"
        />

        <Marker
          coordinate={meCoord}
          anchor={{ x: 0.5, y: showCityLabels && me.city ? 0.34 : 0.5 }}
          tracksViewChanges={tracks}
        >
          <DistanceMarker
            initial={me.initial}
            avatarUrl={me.avatarUrl}
            city={showCityLabels ? me.city : undefined}
          />
        </Marker>

        <Marker
          coordinate={partnerCoord}
          anchor={{ x: 0.5, y: showCityLabels && partner.city ? 0.34 : 0.5 }}
          tracksViewChanges={tracks}
        >
          <DistanceMarker
            initial={partner.initial}
            avatarUrl={partner.avatarUrl}
            city={showCityLabels ? partner.city : undefined}
          />
        </Marker>

        <Marker
          coordinate={{ latitude: mid.lat, longitude: mid.lon }}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracks}
        >
          <View style={styles.heart}>
            <HeartIcon size={15} color={colors.accent.primary} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
}

/** Compare avatar URLs by path so periodic re-signing (new query string) does
 *  not count as a change. */
function baseUrl(url?: string): string | undefined {
  return url ? url.split("?")[0] : url;
}

function samePerson(a: MapPerson, b: MapPerson): boolean {
  return (
    a.coord.lat === b.coord.lat &&
    a.coord.lon === b.coord.lon &&
    a.initial === b.initial &&
    a.city === b.city &&
    baseUrl(a.avatarUrl) === baseUrl(b.avatarUrl)
  );
}

// A by-value comparator: unrelated re-renders (mi/km toggle, re-signed avatar
// URLs, 60s refetches) keep the same values, so the map never re-renders and
// the native markers can't jump to the corner.
export const DistanceMap = memo(
  DistanceMapComponent,
  (prev, next) =>
    prev.interactive === next.interactive &&
    prev.showCityLabels === next.showCityLabels &&
    prev.style === next.style &&
    samePerson(prev.me, next.me) &&
    samePerson(prev.partner, next.partner),
);

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    backgroundColor: colors.bg.canvas,
  },
  heart: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg.canvas,
    borderWidth: 1.5,
    borderColor: colors.accent.primary,
  },
});
