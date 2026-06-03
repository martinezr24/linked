import Svg, { Path, Rect } from "react-native-svg";

type IconProps = { size?: number; color: string };

export function TabHomeIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TabPlansIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect
        x={4}
        y={5}
        width={16}
        height={15}
        rx={2}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M4 9h16M8 3v4M16 3v4" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function TabEventsIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M6 4h12v16H6z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M9 8h6M9 12h6M9 16h4" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

export function TabSettingsIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M19 12a7 7 0 00.1-1.5l2-1.5-2-3.5-2.3.7A7 7 0 0014 4.5L13.5 2h-3L10 4.5a7 7 0 00-2.8 1.7l-2.3-.7-2 3.5 2 1.5A7 7 0 004 12c0 .5.05 1 .15 1.5l-2 1.5 2 3.5 2.3-.7A7 7 0 0010 19.5l.5 2.5h3l.5-2.5a7 7 0 002.8-1.7l2.3.7 2-3.5-2-1.5c.1-.5.15-1 .15-1.5z"
        fill="none"
        stroke={color}
        strokeWidth={1.2}
      />
    </Svg>
  );
}
