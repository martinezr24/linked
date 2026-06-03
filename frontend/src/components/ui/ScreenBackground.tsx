import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/theme/useTheme";

type Props = ViewProps & {
  children: React.ReactNode;
};

export function ScreenBackground({ children, style, ...rest }: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.root, style]} {...rest}>
      <LinearGradient
        colors={[
          theme.colors.gradient.top,
          theme.colors.gradient.mid,
          theme.colors.gradient.bottom,
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0F0C0D",
  },
});
