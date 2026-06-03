import { Alert, Platform } from "react-native";

export function showMutationError(message: string) {
  if (Platform.OS === "web") {
    window.alert(message);
    return;
  }
  Alert.alert("Something went wrong", message);
}
