import Svg, { Circle, Ellipse, G } from "react-native-svg";

import { useTheme } from "@/theme/useTheme";

type Props = { size?: number };

/**
 * Orbit logo: two bodies on one shared, tilted orbit — the couple circling a
 * single path, at opposite ends (long-distance). One accent, one light.
 */
export function AppMark({ size = 28 }: Props) {
  const theme = useTheme();
  const ring = theme.colors.text.primary;
  const accent = theme.colors.accent.primary;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G rotation={-20} origin="16, 16">
        <Ellipse
          cx={16}
          cy={16}
          rx={13}
          ry={6.2}
          fill="none"
          stroke={ring}
          strokeWidth={1.9}
        />
        <Circle cx={3} cy={16} r={3.3} fill={accent} />
        <Circle cx={29} cy={16} r={3.3} fill={ring} />
      </G>
    </Svg>
  );
}
