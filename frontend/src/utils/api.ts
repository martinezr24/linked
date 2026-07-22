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
  timeoutMs = 20000,
): Promise<Response> {
  const url = `${getApiBase()}${path}`;
  const headers = {
    ...apiHeaders(deviceId),
    ...(init?.headers ?? {}),
  };

  // Respect a caller-provided signal (e.g. its own cancellation) as-is.
  if (init?.signal) {
    return fetch(url, { ...init, headers });
  }

  // React Native's fetch has no default timeout, so a hung request (e.g. a
  // backend cold start or a down database) would spin forever. Abort after
  // timeoutMs so React Query surfaces an error state instead of an eternal load.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${path}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
