import Svg, { Path } from "react-native-svg";

type Props = { size?: number; outer?: string; inner?: string };

const OUTER_PATH =
  "M12 2c.5 2.4-.6 3.9-1.9 5.4-1.3 1.5-2.7 3-2.7 5.4a6.6 6.6 0 0 0 13.2 0c0-2.6-1.3-4.6-2.6-6.3-.4 1.2-1.1 1.9-2 2.3.6-2.4-.4-4.6-1.6-6.2C13.6 1.5 12.7 1.8 12 2Z";
const INNER_PATH =
  "M13.4 10.8c1.5 1.9 2.4 3.2 2.4 4.9a2.4 2.4 0 0 1-4.8 0c0-1.1.5-2 1.1-3 .4-.6.9-1.2 1.3-1.9Z";

/** Two-tone flame; reads as fire from 14px up to hero sizes. */
export function FlameIcon({
  size = 16,
  outer = "#FF8C42",
  inner = "#FFD166",
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={OUTER_PATH} fill={outer} />
      <Path d={INNER_PATH} fill={inner} />
    </Svg>
  );
}


