import { useLocalSearchParams } from "expo-router";

import { SharedListScreen } from "@/components/SharedListScreen";
import { formatMMDDYYYY } from "@/utils/dates";

export default function VisitPlanScreen() {
  const { eventId, title, eventAt } = useLocalSearchParams<{
    eventId: string;
    title?: string;
    eventAt?: string;
  }>();

  const headerTitle = title
    ? eventAt
      ? `${title} (${formatMMDDYYYY(eventAt)})`
      : title
    : "Plan this visit";

  if (!eventId) {
    return null;
  }

  return (
    <SharedListScreen
      listType="visit"
      title={headerTitle}
      placeholder="Add a plan for this visit..."
      notePlaceholder="Optional note..."
      eventId={eventId}
      showBack
    />
  );
}
