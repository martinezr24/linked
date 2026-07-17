/**
 * Compact dark map style for Google Maps (Android). iOS uses Apple Maps with
 * `userInterfaceStyle="dark"`, so this is only applied on Android.
 */
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1c151c" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8085" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#151318" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ color: "#5a4a52" }],
  },
  {
    featureType: "administrative.country",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9a8f94" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2b2831" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6e6367" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f0c0d" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a4045" }],
  },
] as const;
