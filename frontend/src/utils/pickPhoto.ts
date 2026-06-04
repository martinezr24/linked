import * as ImagePicker from "expo-image-picker";

export type PhotoSource = "camera" | "library";

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
  allowsEditing: true,
  aspect: [1, 1],
};

export async function pickPhotoFromSource(
  source: PhotoSource,
): Promise<string | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      throw new Error("camera_denied");
    }
    const result = await ImagePicker.launchCameraAsync(pickerOptions);
    if (result.canceled || !result.assets[0]?.uri) return null;
    return result.assets[0].uri;
  }

  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("library_denied");
  }
  const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled || !result.assets[0]?.uri) return null;
  return result.assets[0].uri;
}
