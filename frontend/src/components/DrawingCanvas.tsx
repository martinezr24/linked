import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import type { DrawingData } from "@/types";

type Props = {
  data: DrawingData;
  style?: StyleProp<ViewStyle>;
};

/** Renders a saved drawing from its vector strokes, scaled to fit. */
export function DrawingCanvas({ data, style }: Props) {
  const width = data.width || 1;
  const height = data.height || 1;

  return (
    <View style={[styles.wrap, { aspectRatio: width / height }, style]}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <Rect
          x={0}
          y={0}
          width={width}
          height={height}
          fill={data.background}
        />
        {data.strokes.map((stroke, i) => (
          <Path
            key={i}
            d={stroke.path}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
});
