import { getApiBase } from "@/constants/api";

export function resolveMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  return `${getApiBase()}${url.startsWith("/") ? url : `/${url}`}`;
}
