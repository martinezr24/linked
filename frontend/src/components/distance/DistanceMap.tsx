import { memo, useRef } from "react";
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


// Two avatars rendered at (nearly) the same spot overlap and look broken. When
// the couple is in the same area, spread the *display* positions to a minimum
// separation — symmetrically around their midpoint, along the line between them
// — so both stay legible with the heart between. The real distance number is
// computed elsewhere from the true coordinates, so accuracy is unaffected.
const MIN_SEP_DEG = 0.06; // ~4 mi of angular separation

function separatedCoords(a: LatLng, b: LatLng): [LatLng, LatLng] {
  const dLat = b.lat - a.lat;
  const dLon = b.lon - a.lon;
  const dist = Math.hypot(dLat, dLon);
  if (dist >= MIN_SEP_DEG) return [a, b];
  const midLat = (a.lat + b.lat) / 2;
  const midLon = (a.lon + b.lon) / 2;
  // Unit vector between them; default to vertical if the coords coincide.
  const ux = dist === 0 ? 0 : dLon / dist;
  const uy = dist === 0 ? 1 : dLat / dist;
  const half = MIN_SEP_DEG / 2;
  return [
    { lat: midLat - uy * half, lon: midLon - ux * half },
    { lat: midLat + uy * half, lon: midLon + ux * half },
  ];
}

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

// The preview map is small (~130px); a large edge padding would cram both
// markers into the center. Use a tighter inset for the non-interactive preview,
// with extra bottom clearance so the lower avatar sits above Apple's attribution.
const edgePaddingFor = (interactive: boolean) =>
  interactive
    ? { top: 56, right: 56, bottom: 56, left: 56 }
    : { top: 22, right: 22, bottom: 40, left: 22 };

function DistanceMapComponent({
  me,
  partner,
  interactive = false,
  showCityLabels = true,
  style,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const fitted = useRef(false);
  // Keep marker views in "tracking" mode so they always re-rasterize at the
  // correct position. The memo comparator on this component keeps re-renders
  // rare, so this is cheap — and it prevents the react-native-maps bug where a
  // custom marker jumps to the map's top-left corner if it re-renders (e.g. the
  // avatar image finishing loading) while tracksViewChanges is false.
  const tracks = true;
  const markerSize = interactive ? 44 : 34;

  const [meC, partnerC] = separatedCoords(me.coord, partner.coord);
  const meCoord = { latitude: meC.lat, longitude: meC.lon };
  const partnerCoord = { latitude: partnerC.lat, longitude: partnerC.lon };
  const mid = midpoint(meC, partnerC);

  // Frame both markers once. Guarding prevents re-fitting (which would fight
  // the user's own pan/zoom on the interactive map).
  const fitBounds = () => {
    if (fitted.current) return;
    fitted.current = true;
    mapRef.current?.fitToCoordinates([meCoord, partnerCoord], {
      edgePadding: edgePaddingFor(interactive),
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
        initialRegion={regionForCoords(meC, partnerC)}
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
            size={markerSize}
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
            size={markerSize}
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
