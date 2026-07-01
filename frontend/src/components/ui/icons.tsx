import Svg, {
  Circle,
  Line,
  Path,
  Polyline,
  Rect,
} from "react-native-svg";

export type IconProps = { size?: number; color: string };

const V = "0 0 24 24";
const SW = 1.8;

/* ----------------------------------------------------------------------------
 * Navigation & functional glyphs
 * ------------------------------------------------------------------------- */

export function ChevronLeftIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Polyline
        points="15 5 8 12 15 19"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Polyline
        points="9 5 16 12 9 19"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronDownIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Polyline
        points="5 9 12 16 19 9"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowLeftIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M20 12H4M10 6l-6 6 6 6"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M4 12h16M14 6l6 6-6 6"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SwapIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M7 8h13M7 8l3-3M7 8l3 3M17 16H4M17 16l-3-3M17 16l-3 3"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Polyline
        points="5 13 10 18 19 7"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UndoIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M9 8L5 12l4 4M5 12h9a4 4 0 010 8h-1"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BackspaceIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M9 5h10a2 2 0 012 2v10a2 2 0 01-2 2H9l-6-7 6-7z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M12.5 10l5 4M17.5 10l-5 4"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ----------------------------------------------------------------------------
 * Result & celebration
 * ------------------------------------------------------------------------- */

export function TrophyIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M7 4h10v5a5 5 0 01-10 0V4z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M7 5H4v2a3 3 0 003 3M17 5h3v2a3 3 0 01-3 3M12 14v3M9 20h6l-.7-3h-4.6L9 20z"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BrokenHeartIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M12 20S3.5 15 3.5 8.9A4.4 4.4 0 0112 6a4.4 4.4 0 018.5 2.9C20.5 15 12 20 12 20z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M12 6l-2 4 3 2-2.5 4"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HandshakeIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M12 8.5L9.7 6.3a2 2 0 00-2.8 0L3 10v4l2 2M12 8.5l2.3-2.2a2 2 0 012.8 0L21 10v4l-2 2"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 13.5l1.8 1.8a1.6 1.6 0 002.2 0M12 15.3l1.6 1.6a1.6 1.6 0 002.2 0"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CelebrationIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M12 3l1.4 3.1L16.5 7.5 14 9.8l.6 3.4-2.6-1.7-2.6 1.7.6-3.4L7.5 7.5l3.1-1.4L12 3z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M5 17.5h.01M19 17h.01M6.5 21h.01M17.5 21h.01M20 12h.01M4 12h.01"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/* ----------------------------------------------------------------------------
 * Game icons
 * ------------------------------------------------------------------------- */

export function Connect4Icon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Circle cx={8} cy={16} r={3.2} fill={color} />
      <Circle cx={16} cy={8} r={3.2} fill={color} />
      <Circle cx={8} cy={8} r={3.2} stroke={color} strokeWidth={SW} />
      <Circle cx={16} cy={16} r={3.2} stroke={color} strokeWidth={SW} />
    </Svg>
  );
}

export function TicTacToeIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M9.5 4v16M14.5 4v16M4 9.5h16M4 14.5h16"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function WordGuessIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Rect x={2.5} y={8} width={5} height={8} rx={1.2} stroke={color} strokeWidth={SW} />
      <Rect x={9.5} y={8} width={5} height={8} rx={1.2} fill={color} />
      <Rect x={16.5} y={8} width={5} height={8} rx={1.2} stroke={color} strokeWidth={SW} />
    </Svg>
  );
}

export function DotsBoxesIcon({ size = 24, color }: IconProps) {
  const xs = [5, 12, 19];
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      {xs.map((cy) =>
        xs.map((cx) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.5} fill={color} />
        )),
      )}
    </Svg>
  );
}

export function BattleshipIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M3 14h18l-2.2 4.5a1 1 0 01-.9.5H6.1a1 1 0 01-.9-.5L3 14z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 14v-2.5H15l3 2.5M11 11.5V5l6 3-6 2"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TriviaIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M4 5h16a1 1 0 011 1v9a1 1 0 01-1 1H10l-4 4v-4H4a1 1 0 01-1-1V6a1 1 0 011-1z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 9a2.5 2.5 0 113.2 2.4c-.7.2-1.2.8-1.2 1.6"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <Circle cx={11.5} cy={15.2} r={0.9} fill={color} />
    </Svg>
  );
}

/* ----------------------------------------------------------------------------
 * Treats
 * ------------------------------------------------------------------------- */

export function CoffeeIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M5 9h11v4a5 5 0 01-5 5H10a5 5 0 01-5-5V9z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M16 10.5h1.5a2 2 0 010 4H16M4 21h13"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <Path
        d="M8.5 3c0 1.2-1 1.2-1 2.4M11.5 3c0 1.2-1 1.2-1 2.4"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function DiningIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M8 3v6a2 2 0 01-2 2m2-8v18M6 3v8m4-8v6a2 2 0 01-2 2"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 3c-1.6 1.4-1.6 6.6 0 8v10"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DessertIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M6 12h12l-1.4 7.2a1 1 0 01-1 .8H8.4a1 1 0 01-1-.8L6 12z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M6.2 12a5.8 4.5 0 0111.6 0"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M12 7.5V4.5"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <Circle cx={12} cy={4} r={1.3} fill={color} />
    </Svg>
  );
}

export function RideIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M3 13l2-4.5A2 2 0 016.8 7h10.4a2 2 0 011.8 1.5L21 13v4a1 1 0 01-1 1h-1M3 13v4a1 1 0 001 1h1M3 13h18"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={7.5} cy={18} r={1.6} stroke={color} strokeWidth={SW} />
      <Circle cx={16.5} cy={18} r={1.6} stroke={color} strokeWidth={SW} />
    </Svg>
  );
}

export function GiftIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Rect x={4} y={10} width={16} height={10} rx={1} stroke={color} strokeWidth={SW} />
      <Rect x={3} y={7} width={18} height={3} rx={1} stroke={color} strokeWidth={SW} />
      <Path d="M12 7v13" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Path
        d="M12 7C11 4.2 7.5 4.2 7.5 6.4S10.8 7 12 7zM12 7c1-2.8 4.5-2.8 4.5-.6S13.2 7 12 7z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ----------------------------------------------------------------------------
 * Weather
 * ------------------------------------------------------------------------- */

export function SunIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={SW} />
      <Path
        d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CloudIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M7 18h9.5a4 4 0 000-8 5 5 0 00-9.6-1.3A3.6 3.6 0 007 18z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RainIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M7 15h9.5a4 4 0 000-8 5 5 0 00-9.6-1.3A3.6 3.6 0 007 15z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M8.5 18l-1 2.5M12 18l-1 2.5M15.5 18l-1 2.5"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SnowIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
      <Path
        d="M9.5 4.5L12 6l2.5-1.5M9.5 19.5L12 18l2.5 1.5M4.6 10.5l.3 2.9-2.5 1.5M19.4 10.5l-.3 2.9 2.5 1.5"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StormIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M7 14h9.5a4 4 0 000-8 5 5 0 00-9.6-1.3A3.6 3.6 0 007 14z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Path
        d="M12.5 14l-2.5 3.5h3L10.5 21"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PartlyCloudyIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Circle cx={9} cy={8} r={3} stroke={color} strokeWidth={SW} />
      <Path
        d="M9 2.5v1.5M3.5 8H5M13 8h1.5M5.2 4.2l1 1M12.8 4.2l-1 1"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      <Path
        d="M8 20h8a3.5 3.5 0 000-7 4 4 0 00-7.6-1A3 3 0 008 20z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ThermometerIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Path
        d="M14 14.8V5a2 2 0 10-4 0v9.8a4 4 0 104 0z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={17} r={1.6} fill={color} />
      <Line x1={12} y1={9} x2={12} y2={16} stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

/* ----------------------------------------------------------------------------
 * Misc
 * ------------------------------------------------------------------------- */

export function LockIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={2} stroke={color} strokeWidth={SW} />
      <Path
        d="M8 11V8a4 4 0 018 0v3"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function EnvelopeIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Rect x={3} y={6} width={18} height={12} rx={2} stroke={color} strokeWidth={SW} />
      <Path
        d="M3.5 7.5l8.5 6 8.5-6"
        stroke={color}
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function DiceIcon({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox={V} fill="none">
      <Rect x={4} y={4} width={16} height={16} rx={3.5} stroke={color} strokeWidth={SW} />
      <Circle cx={8.5} cy={8.5} r={1.2} fill={color} />
      <Circle cx={15.5} cy={8.5} r={1.2} fill={color} />
      <Circle cx={12} cy={12} r={1.2} fill={color} />
      <Circle cx={8.5} cy={15.5} r={1.2} fill={color} />
      <Circle cx={15.5} cy={15.5} r={1.2} fill={color} />
    </Svg>
  );
}
