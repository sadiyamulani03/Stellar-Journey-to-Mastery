import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllDisputes,
  getArbiterStake,
  getArbiterActiveVotes,
  stakeBondOnChain,
  withdrawBondOnChain,
  voteOnDisputeOnChain,
  resolveDisputeOnChain,
  DisputeData,
} from '../services/stellar';
import { useTxStore } from '../store/useTxStore';
import { useToastStore } from '../store/useToastStore';
import { useWalletStore } from '../store/useWalletStore';
import { useAuthStore } from '../store/useAuthStore';

function filterDisputesForUser(disputes: DisputeData[], address: string | null) {
  if (!address) {
    return [];
  }

  return disputes.filter(
    (dispute) => dispute.employer === address || dispute.contractor === address
  );
}

export function useDisputes() {
  const queryClient = useQueryClient();
  const { kit, address, isConnected } = useWalletStore();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const { addTransaction } = useTxStore();
  const { addToast } = useToastStore();

  const disputesQuery = useQuery<DisputeData[]>({
    queryKey: ['disputes', userId, address],
    queryFn: async () => {
      const allDisputes = await fetchAllDisputes();
      return filterDisputesForUser(allDisputes, address);
    },
    enabled: !!userId,
  });

  const arbiterStakeQuery = useQuery<number>({
    queryKey: ['arbiterStake', address],
    queryFn: () => (address ? getArbiterStake(address) : 0),
    enabled: !!address,
  });

  const activeVotesQuery = useQuery<number>({
    queryKey: ['arbiterActiveVotes', address],
    queryFn: () => (address ? getArbiterActiveVotes(address) : 0),
    enabled: !!address,
  });

  const stakeBondMutation = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `stake-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await stakeBondOnChain(kit, address, amount, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Successfully staked ${amount} XLM security bond.`, 'success');
          queryClient.invalidateQueries({ queryKey: ['arbiterStake', address] });
          queryClient.invalidateQueries({ queryKey: ['walletBalance', address] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Staking failed: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Stake security deposit: ${amount} XLM`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const withdrawBondMutation = useMutation({
    mutationFn: async ({ amount }: { amount: number }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `withdraw-bond-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await withdrawBondOnChain(kit, address, amount, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Withdrew ${amount} XLM security bond successfully (no interest paid).`, 'success');
          queryClient.invalidateQueries({ queryKey: ['arbiterStake', address] });
          queryClient.invalidateQueries({ queryKey: ['walletBalance', address] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Withdraw failed: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Withdraw security deposit: ${amount} XLM`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const voteOnDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, vote, streamTitle }: { disputeId: number; vote: number; streamTitle: string }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `vote-${disputeId}-${Date.now()}`;
      const voteText = vote === 1 ? 'Release to Contractor' : 'Refund to Employer';

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await voteOnDisputeOnChain(kit, address, disputeId, vote, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Vote cast: "${voteText}" for Dispute #${disputeId}`, 'success');
          queryClient.invalidateQueries({ queryKey: ['disputes'] });
          queryClient.invalidateQueries({ queryKey: ['arbiterActiveVotes', address] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Voting failed: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Cast vote on dispute #${disputeId} (${streamTitle})`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ disputeId, streamTitle }: { disputeId: number; streamTitle: string }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `resolve-disp-${disputeId}-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await resolveDisputeOnChain(kit, address, disputeId, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Dispute #${disputeId} successfully finalized. Slashes and fees distributed!`, 'success');
          queryClient.invalidateQueries({ queryKey: ['disputes'] });
          queryClient.invalidateQueries({ queryKey: ['streams'] });
          queryClient.invalidateQueries({ queryKey: ['arbiterStake', address] });
          queryClient.invalidateQueries({ queryKey: ['arbiterActiveVotes', address] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Finalization failed: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Finalize dispute #${disputeId} (${streamTitle})`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  return {
    disputes: disputesQuery.data || [],
    isLoading: disputesQuery.isLoading,
    refetchDisputes: disputesQuery.refetch,
    arbiterStake: arbiterStakeQuery.data || 0,
    activeVotesCount: activeVotesQuery.data || 0,
    stakeBond: stakeBondMutation.mutateAsync,
    isStaking: stakeBondMutation.isPending,
    withdrawBond: withdrawBondMutation.mutateAsync,
    isWithdrawing: withdrawBondMutation.isPending,
    voteOnDispute: voteOnDisputeMutation.mutateAsync,
    resolveDispute: resolveDisputeMutation.mutateAsync,
  };
}
