import { SharedListScreen } from "@/components/SharedListScreen";

export default function TripScreen() {
  return (
    <SharedListScreen
      listType="trip"
      title="Trip itinerary"
      placeholder="Add a trip plan..."
    />
  );
}
