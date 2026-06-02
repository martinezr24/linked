import { type Href, Redirect } from "expo-router";

import { useRelationship } from "@/context/RelationshipContext";

export default function Index() {
  const { isReady, isPaired } = useRelationship();

  if (!isReady) {
    return null;
  }

  if (!isPaired) {
    return <Redirect href="/pair" />;
  }

  return <Redirect href={"/(tabs)" as Href} />;
}
