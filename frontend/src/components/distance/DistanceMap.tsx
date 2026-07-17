import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";

import { DistanceMarker } from "./DistanceMarker";
import { DARK_MAP_STYLE } from "./darkMapStyle";
import { AppText } from "@/components/ui/AppText";
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

export function DistanceMap({
  me,
  partner,
  interactive = false,
  showCityLabels = true,
  style,
}: Props) {
  const mapRef = useRef<MapView>(null);
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

  const fitBounds = () => {
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
        pointerEvents={interactive ? "auto" : "none"}
      >
        <Polyline
          coordinates={[meCoord, partnerCoord]}
          strokeColor={colors.accent.primary}
          strokeWidth={2.5}
          lineDashPattern={[6, 7]}
          lineCap="round"
        />

        <Marker coordinate={meCoord} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={tracks}>
          <DistanceMarker initial={me.initial} avatarUrl={me.avatarUrl} />
        </Marker>

        <Marker
          coordinate={partnerCoord}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={tracks}
        >
          <DistanceMarker initial={partner.initial} avatarUrl={partner.avatarUrl} />
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

        {showCityLabels && me.city ? (
          <Marker
            coordinate={meCoord}
            anchor={{ x: 0.5, y: 0 }}
            tracksViewChanges={tracks}
            pointerEvents="none"
          >
            <View style={styles.cityWrap}>
              <View style={styles.cityPill}>
                <AppText style={styles.cityText}>{me.city}</AppText>
              </View>
            </View>
          </Marker>
        ) : null}

        {showCityLabels && partner.city ? (
          <Marker
            coordinate={partnerCoord}
            anchor={{ x: 0.5, y: 0 }}
            tracksViewChanges={tracks}
            pointerEvents="none"
          >
            <View style={styles.cityWrap}>
              <View style={styles.cityPill}>
                <AppText style={styles.cityText}>{partner.city}</AppText>
              </View>
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

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
  cityWrap: {
    paddingTop: 32,
    alignItems: "center",
  },
  cityPill: {
    backgroundColor: "rgba(12,10,11,0.9)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
  },
  cityText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "DMSans_600SemiBold",
  },
});
