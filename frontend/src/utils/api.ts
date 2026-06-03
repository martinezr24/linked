import { getApiBase } from "@/constants/api";
import { localDateString } from "@/utils/dates";

export function apiHeaders(deviceId: string): HeadersInit {
  return {
    "X-Device-Id": deviceId,
    "X-Local-Date": localDateString(),
  };
}

export async function apiFetch(
  path: string,
  deviceId: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      ...apiHeaders(deviceId),
      ...(init?.headers ?? {}),
    },
  });
}
