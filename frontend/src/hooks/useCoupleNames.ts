import { useProfile } from "@/hooks/useProfile";

export function useCoupleNames() {
  const { mineName, partnerName, isLoading, refetch } = useProfile();

  return {
    mineName,
    partnerName,
    ready: !isLoading,
    reload: refetch,
    setMineName: () => {},
    setPartnerName: () => {},
  };
}
