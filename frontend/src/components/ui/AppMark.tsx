import Svg, { Path } from "react-native-svg";

import { useTheme } from "@/theme/useTheme";

type Props = { size?: number };

export function AppMark({ size = 28 }: Props) {
  const theme = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        d="M16 28c-4-6-10-9-10-15a6 6 0 0112 0c0 6-6 9-10 15z"
        fill="none"
        stroke={theme.colors.text.primary}
        strokeWidth={1.8}
      />
      <Path
        d="M10 13c2-3 5-4 6-4s4 1 6 4"
        fill="none"
        stroke={theme.colors.accent.primary}
        strokeWidth={1.5}
      />
      <Path
        d="M12 10c1-2 2.5-3 4-3s3 1 4 3"
        fill="none"
        stroke={theme.colors.accent.primary}
        strokeWidth={1.2}
        opacity={0.7}
      />
    </Svg>
  );
}
