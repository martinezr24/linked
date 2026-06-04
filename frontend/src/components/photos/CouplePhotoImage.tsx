import { Image, type ImageStyle, type StyleProp } from "react-native";

import { useRelationship } from "@/context/RelationshipContext";
import { resolveMediaUrl } from "@/utils/mediaUrl";

type Props = {
  url: string;
  style?: StyleProp<ImageStyle>;
};

export function CouplePhotoImage({ url, style }: Props) {
  const { deviceId } = useRelationship();
  const uri = resolveMediaUrl(url);

  return (
    <Image
      source={{
        uri,
        headers: deviceId ? { "X-Device-Id": deviceId } : undefined,
      }}
      style={style}
    />
  );
}
