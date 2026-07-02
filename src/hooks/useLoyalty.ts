import { useQuery } from '@tanstack/react-query';
import { getPoints } from '../services/stellar';

export function useLoyalty(address: string | null) {
  const pointsQuery = useQuery<number>({
    queryKey: ['loyaltyPoints', address],
    queryFn: () => (address ? getPoints(address) : 0),
    enabled: !!address,
  });

  return {
    points: pointsQuery.data || 0,
    isLoading: pointsQuery.isLoading,
    refetchPoints: pointsQuery.refetch,
  };
}
