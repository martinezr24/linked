import * as ImagePicker from "expo-image-picker";

export type PhotoSource = "camera" | "library";

// No `allowsEditing`/`aspect`: on iOS the built-in editor forces a square crop
// (cutting off the rest of the photo) and, with the front camera, returns a
// mirrored/rotated ("inverted") image. Capturing the full frame avoids both.
const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
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
