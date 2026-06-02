import {
  TextInput,
  type TextInputProps,
  StyleSheet,
} from "react-native";

import { INPUT_TEXT_COLOR, PLACEHOLDER_COLOR } from "@/constants/ui";

export function AppTextInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={PLACEHOLDER_COLOR}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    color: INPUT_TEXT_COLOR,
  },
});
