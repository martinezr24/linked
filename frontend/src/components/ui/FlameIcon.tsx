import Svg, { Path } from "react-native-svg";

type Props = { size?: number; outer?: string; inner?: string };

export function FlameIcon({
  size = 16,
  outer = "#FF8C42",
  inner = "#FFD166",
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2c1 4 4 5 4 9a4 4 0 01-8 0c0-2 1-3 2-5 0 3-2 5-4 6 1-4 4-6 6-10z"
        fill={outer}
      />
      <Path
        d="M12 10c0 2 1.5 3.5 2 5.5a2.5 2.5 0 01-4 0c0-1.5 1-2.5 2-5.5z"
        fill={inner}
      />
    </Svg>
  );
}
