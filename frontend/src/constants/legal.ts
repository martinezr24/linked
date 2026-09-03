import { getApiBase } from "@/constants/api";

export function getPrivacyUrl(): string {
  return `${getApiBase()}/privacy`;
}

export function getSupportUrl(): string {
  return `${getApiBase()}/support`;
}

export const SUPPORT_EMAIL = "support@martinez.dev";
