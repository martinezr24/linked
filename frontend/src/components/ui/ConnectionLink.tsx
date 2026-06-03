import Svg, { Path } from "react-native-svg";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";

type Variant = "horizontal" | "vertical";

type Props = {
  variant?: Variant;
  length?: number;
  showBow?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ConnectionLink({
  variant = "horizontal",
  length = 48,
  showBow = true,
  style,
}: Props) {
  const theme = useTheme();
  const thickness = 2;
  const isHorizontal = variant === "horizontal";
  const width = isHorizontal ? length : thickness;
  const height = isHorizontal ? thickness : length;

  return (
    <View style={[{ width, height, justifyContent: "center", alignItems: "center" }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {isHorizontal ? (
          <Path
            d={`M0 ${height / 2} H${width}`}
            stroke={theme.colors.accent.primary}
            strokeWidth={thickness}
            fill="none"
          />
        ) : (
          <Path
            d={`M${width / 2} 0 V${height}`}
            stroke={theme.colors.accent.primary}
            strokeWidth={thickness}
            fill="none"
          />
        )}
        {showBow ? (
          <Path
            d={
              isHorizontal
                ? `M${width / 2 - 6} ${height / 2 - 4} Q${width / 2} ${height / 2 - 10} ${width / 2 + 6} ${height / 2 - 4} Q${width / 2 + 8} ${height / 2 + 2} ${width / 2} ${height / 2 + 6} Q${width / 2 - 8} ${height / 2 + 2} ${width / 2 - 6} ${height / 2 - 4}`
                : `M${width / 2 - 4} ${height / 2 - 6} Q${width / 2 - 10} ${height / 2} ${width / 2 - 4} ${height / 2 + 6} Q${width / 2 + 2} ${height / 2 + 8} ${width / 2 + 6} ${height / 2} Q${width / 2 + 2} ${height / 2 - 8} ${width / 2 - 4} ${height / 2 - 6}`
            }
            stroke={theme.colors.accent.primary}
            strokeWidth={1.5}
            fill="none"
          />
        ) : null}
      </Svg>
    </View>
  );
}
