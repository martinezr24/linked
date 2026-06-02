import { getApiBase } from "@/constants/api";

export function apiHeaders(deviceId: string): HeadersInit {
  return { "X-Device-Id": deviceId };
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
