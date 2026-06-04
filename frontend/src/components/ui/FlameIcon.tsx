import Svg, { Path } from "react-native-svg";

type Props = { size?: number; outer?: string; inner?: string };

/** Simple flame readable at 14–16px (avoids gem-like blob). */
export function FlameIcon({
  size = 16,
  outer = "#FF8C42",
  inner = "#FFD166",
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 20">
      <Path
        d="M8 1.5c.8 2.2 2.8 3 2.8 5.8a3.2 3.2 0 01-6.4 0c0-1.4.8-2.2 1.6-3.6C4.8 6.5 3.5 8.2 3 10.2 2 13.5 4.2 16.5 8 18.5c3.8-2 6-5 5-8.3-.5-2-1.8-3.7-3-5.2z"
        fill={outer}
      />
      <Path
        d="M8 9.2c.6 1.2 1.2 2.2 1.2 3.6a1.8 1.8 0 01-3.6 0c0-.9.5-1.6 1-2.8.4-.8.8-1.4 1.4-2.2.5.8.8 1.2 1 1.4z"
        fill={inner}
      />
    </Svg>
  );
}
