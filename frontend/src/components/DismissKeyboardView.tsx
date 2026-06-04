import type { ReactNode } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  View,
  type ViewStyle,
} from "react-native";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  scroll?: boolean;
  scrollProps?: ScrollViewProps;
};

/** Tap outside inputs to dismiss the keyboard. */
export function DismissKeyboardView({
  children,
  style,
  scroll = true,
  scrollProps,
}: Props) {
  // Do not wrap in Pressable when scroll=false — it blocks nested ScrollViews.
  if (!scroll) {
    return <View style={[styles.flex, style]}>{children}</View>;
  }

  const inner = <View style={[styles.inner, style]}>{children}</View>;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      {...scrollProps}
    >
      <Pressable onPress={Keyboard.dismiss} accessible={false}>
        {inner}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  inner: { flex: 1 },
});
