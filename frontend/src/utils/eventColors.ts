import type { EventOwnerType } from "@/types";
import type { ThemeTokens } from "@/theme/tokens";

export function eventColorFor(
  ownerType: EventOwnerType | undefined,
  theme: ThemeTokens,
) {
  switch (ownerType ?? "shared") {
    case "self":
      return theme.colors.event.self;
    case "partner":
      return theme.colors.event.partner;
    default:
      return theme.colors.event.shared;
  }
}

export function ownerFilterLabel(
  ownerType: EventOwnerType | "all",
  mineName?: string | null,
  partnerName?: string | null,
): string {
  switch (ownerType) {
    case "all":
      return "All";
    case "self":
      return mineName?.trim() || "Me";
    case "partner":
      return partnerName?.trim() || "Partner";
    case "shared":
      return "Both";
  }
}

export function matchesOwnerFilter(
  ownerType: EventOwnerType | undefined,
  filter: EventOwnerType | "all",
): boolean {
  if (filter === "all") return true;
  return (ownerType ?? "shared") === filter;
}
