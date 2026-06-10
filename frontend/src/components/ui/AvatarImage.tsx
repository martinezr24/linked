import { useEffect, useState } from "react";
import { Image, StyleSheet, View, type ImageStyle, type StyleProp } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useRelationship } from "@/context/RelationshipContext";
import { resolveMediaUrl } from "@/utils/mediaUrl";

type Props = {
  url?: string;
  initial: string;
  fallbackColor: string;
  size: number;
  style?: StyleProp<ImageStyle>;
};

export function AvatarImage({
  url,
  initial,
  fallbackColor,
  size,
  style,
}: Props) {
  const { deviceId } = useRelationship();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  const showImage = Boolean(url?.trim()) && !failed;
  const dim = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.wrap, dim, { backgroundColor: fallbackColor }]}>
      {showImage ? (
        <Image
          source={{
            uri: resolveMediaUrl(url!),
            headers: deviceId ? { "X-Device-Id": deviceId } : undefined,
          }}
          style={[dim, style]}
          onError={() => setFailed(true)}
        />
      ) : (
        <AppText
          variant="bodySemibold"
          style={[styles.initial, { fontSize: size * 0.38 }]}
        >
          {initial.slice(0, 1).toUpperCase()}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: { color: "#fff", fontFamily: "DMSans_700Bold" },
});
