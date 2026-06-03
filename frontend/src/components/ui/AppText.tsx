import { Text, type TextProps, type TextStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";

type Variant =
  | "displayHero"
  | "h1"
  | "h2"
  | "body"
  | "bodySemibold"
  | "caption"
  | "label";

type ColorRole = "primary" | "secondary" | "muted" | "accent" | "success";

type Props = TextProps & {
  variant?: Variant;
  color?: ColorRole;
  display?: boolean;
  mono?: boolean;
};

export function AppText({
  variant = "body",
  color = "primary",
  display = false,
  mono = false,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const scale = theme.typography[variant];

  const colorMap: Record<ColorRole, string> = {
    primary: theme.colors.text.primary,
    secondary: theme.colors.text.secondary,
    muted: theme.colors.text.muted,
    accent: theme.colors.accent.primary,
    success: theme.colors.accent.success,
  };

  const fontFamily = mono
    ? theme.fonts.mono
    : display || variant === "displayHero"
      ? theme.fonts.display
      : theme.fonts.body;

  const textStyle: TextStyle = {
    ...scale,
    color: colorMap[color],
    fontFamily,
  };

  return <Text style={[textStyle, style]} {...rest} />;
}
