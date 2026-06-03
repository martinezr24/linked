export const colors = {
  gradient: {
    top: "#3D1528",
    mid: "#1A0F14",
    bottom: "#0A0809",
  },
  bg: {
    canvas: "#0F0C0D",
  },
  surface: {
    card: "#1C1819",
    cardElevated: "#262122",
    input: "#2A2324",
  },
  border: {
    subtle: "rgba(255,255,255,0.08)",
    emphasis: "#8B2942",
  },
  text: {
    primary: "#F5F0F1",
    secondary: "#A89BA0",
    muted: "#6E6367",
    onAccent: "#FFFFFF",
  },
  accent: {
    primary: "#E63946",
    primaryMuted: "#9B2333",
    flame: "#FF8C42",
    flameInner: "#FFD166",
    success: "#4ADE80",
  },
  overlay: {
    glass: "rgba(15,12,13,0.72)",
  },
  avatar: {
    mine: "#5C2A3A",
    partner: "#3A2A5C",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  page: 20,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  displayHero: { fontSize: 56, lineHeight: 64, fontWeight: "700" as const },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: "800" as const },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "700" as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: "400" as const },
  bodySemibold: { fontSize: 16, lineHeight: 22, fontWeight: "600" as const },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const,
    letterSpacing: 1.2,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600" as const,
    letterSpacing: 0.8,
  },
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  stackLayer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
} as const;

export type ThemeTokens = {
  colors: typeof colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  shadow: typeof shadow;
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  ready: boolean;
};

export const staticTokens: Omit<ThemeTokens, "fonts" | "ready"> = {
  colors,
  spacing,
  radius,
  typography,
  shadow,
};
