import { SharedListScreen } from "@/components/SharedListScreen";

export default function TogetherScreen() {
  return (
    <SharedListScreen
      listType="reunion"
      title="When we're together"
      placeholder="Something to do together..."
      notePlaceholder="Optional note..."
    />
  );
}
