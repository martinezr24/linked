import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { AppText } from "@/components/ui/AppText";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { useRelationship } from "@/context/RelationshipContext";
import { uploadProfileAvatar } from "@/utils/avatarUpload";
import { pickPhotoFromSource } from "@/utils/pickPhoto";
import { showMutationError } from "@/utils/errors";
import { initialFromName } from "@/utils/coupleNames";

type Props = {
  displayName?: string | null;
  avatarUrl?: string;
  calendarColor: string;
  onPress?: () => void;
};

export function ProfileAvatarPicker({
  displayName,
  avatarUrl,
  calendarColor,
  onPress,
}: Props) {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();

  const upload = useMutation({
    mutationFn: (uri: string) => uploadProfileAvatar(deviceId!, uri),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPresence });
    },
    onError: () => showMutationError("Could not upload avatar."),
  });

  const pickAvatar = async () => {
    try {
      const uri = await pickPhotoFromSource("library");
      if (uri) upload.mutate(uri);
    } catch {
      showMutationError("Could not open photo library.");
    }
  };

  return (
    <Pressable onPress={onPress ?? pickAvatar} style={styles.wrap}>
      <View>
        <AvatarImage
          url={avatarUrl}
          initial={initialFromName(displayName, "M")}
          fallbackColor={calendarColor}
          size={88}
        />
        {upload.isPending ? (
          <View style={styles.loader}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </View>
      <AppText variant="bodySemibold" color="accent">
        Change photo
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8, marginBottom: 12 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
  },
});
