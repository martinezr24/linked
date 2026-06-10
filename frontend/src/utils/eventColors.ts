import type { ThemeTokens } from "@/theme/tokens";

export const CALENDAR_COLOR_PRESETS = [
  "#C44B6E",
  "#5B7FD4",
  "#8B6FA8",
  "#E63946",
  "#4ADE80",
  "#FF8C42",
  "#FFD166",
  "#2DD4BF",
] as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function contrastingText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#FFFFFF";
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.55 ? "#1A0F14" : "#FFFFFF";
}

export function hexToEventColors(hex: string) {
  return { bg: hex, text: contrastingText(hex) };
}

export type ProfileColors = {
  mineColor?: string;
  partnerColor?: string;
};

export function blendHexColors(a: string, b: string): string {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  if (!rgbA || !rgbB) return a;
  const r = Math.round((rgbA.r + rgbB.r) / 2);
  const g = Math.round((rgbA.g + rgbB.g) / 2);
  const bl = Math.round((rgbA.b + rgbB.b) / 2);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function profilePairColors(
  profile: ProfileColors | undefined,
  theme: ThemeTokens,
) {
  return {
    mine: profile?.mineColor ?? theme.colors.event.self.bg,
    partner: profile?.partnerColor ?? theme.colors.event.partner.bg,
  };
}

export function sharedEventColors(
  profile: ProfileColors | undefined,
  theme: ThemeTokens,
) {
  const { mine, partner } = profilePairColors(profile, theme);
  return hexToEventColors(blendHexColors(mine, partner));
}

export function eventColorFor(
  ownerType: "self" | "partner" | "shared" | undefined,
  theme: ThemeTokens,
  profile?: ProfileColors,
) {
  switch (ownerType ?? "shared") {
    case "self":
      return profile?.mineColor
        ? hexToEventColors(profile.mineColor)
        : theme.colors.event.self;
    case "partner":
      return profile?.partnerColor
        ? hexToEventColors(profile.partnerColor)
        : theme.colors.event.partner;
    default:
      return sharedEventColors(profile, theme);
  }
}

export function ownerFilterLabel(
  ownerType: "self" | "partner" | "shared" | "all",
  mineName?: string | null,
  partnerName?: string | null,
): string {
  switch (ownerType) {
    case "all":
      return "All";
    case "self":
      return mineName?.trim() || "Me";
    case "partner":
      return partnerName?.trim() || "Partner";
    case "shared":
      return "Both";
  }
}

export function matchesOwnerFilter(
  ownerType: "self" | "partner" | "shared" | undefined,
  filter: "self" | "partner" | "shared" | "all",
): boolean {
  if (filter === "all") return true;
  return (ownerType ?? "shared") === filter;
}
