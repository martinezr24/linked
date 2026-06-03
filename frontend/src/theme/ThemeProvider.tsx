import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { DMMono_400Regular, DMMono_500Medium } from "@expo-google-fonts/dm-mono";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { createContext, useEffect, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { colors, staticTokens, type ThemeTokens } from "./tokens";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const ThemeContext = createContext<ThemeTokens | null>(null);

type Props = { children: ReactNode };

export function ThemeProvider({ children }: Props) {
  const [loaded, error] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  const theme: ThemeTokens = {
    ...staticTokens,
    fonts: {
      display: "Fraunces_700Bold",
      body: "DMSans_400Regular",
      mono: "DMMono_400Regular",
    },
    ready: loaded,
  };

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg.canvas,
  },
});
