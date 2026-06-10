import { getApiBase } from "@/constants/api";
import { apiFetch } from "@/utils/api";

export async function uploadProfileAvatar(
  deviceId: string,
  imageUri: string,
): Promise<void> {
  const presignRes = await apiFetch("/api/profile/avatar/presign", deviceId, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: "image/jpeg" }),
  });
  if (!presignRes.ok) throw new Error("Could not prepare upload");
  const { uploadUrl, objectKey } = (await presignRes.json()) as {
    uploadUrl: string;
    objectKey: string;
  };

  const blob = await (await fetch(imageUri)).blob();
  const fullUploadUrl = uploadUrl.startsWith("http")
    ? uploadUrl
    : `${getApiBase()}${uploadUrl}`;

  const putRes = await fetch(fullUploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/jpeg" },
    body: blob,
  });
  if (!putRes.ok) throw new Error("Upload failed");

  const saveRes = await apiFetch("/api/profile/avatar", deviceId, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ objectKey }),
  });
  if (!saveRes.ok) throw new Error("Could not save avatar");
}
