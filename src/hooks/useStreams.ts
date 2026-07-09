import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAllStreams,
  createStreamOnChain,
  fundStreamOnChain,
  pauseStreamOnChain,
  resumeStreamOnChain,
  withdrawWagesOnChain,
  raiseDisputeOnChain,
  StreamData,
} from '../services/stellar';
import { useTxStore } from '../store/useTxStore';
import { useToastStore } from '../store/useToastStore';
import { useWalletStore } from '../store/useWalletStore';
import { useAuthStore } from '../store/useAuthStore';
import { trackProductEvent } from '../lib/monitoring';

function filterStreamsForUser(streams: StreamData[], address: string | null) {
  if (!address) {
    return [];
  }

  return streams.filter(
    (stream) => stream.employer === address || stream.contractor === address
  );
}

export function useStreams() {
  const queryClient = useQueryClient();
  const { kit, address, isConnected } = useWalletStore();
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const { addTransaction, updateTransaction } = useTxStore();
  const { addToast } = useToastStore();

  const streamsQuery = useQuery<StreamData[]>({
    queryKey: ['streams', userId, address],
    queryFn: async () => {
      const allStreams = await fetchAllStreams();
      return filterStreamsForUser(allStreams, address);
    },
    enabled: !!userId,
  });

  const createStreamMutation = useMutation({
    mutationFn: async ({ 
      contractor, 
      token, 
      amount, 
      durationSeconds, 
      title 
    }: { 
      contractor: string; 
      token: string; 
      amount: number; 
      durationSeconds: number; 
      title: string;
    }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `create-${Date.now()}`;
      
      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await createStreamOnChain(kit, address, contractor, token, amount, durationSeconds, title, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Stream "${title}" created successfully!`, 'success');
          trackProductEvent('stream_created', { title, amount, durationSeconds }, userId);
          queryClient.invalidateQueries({ queryKey: ['streams'] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Failed to create stream: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Create stream: ${title}`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const fundStreamMutation = useMutation({
    mutationFn: async ({ streamId, title }: { streamId: number; title: string }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `fund-${streamId}-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await fundStreamOnChain(kit, address, streamId, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Stream "${title}" funded and active!`, 'success');
          trackProductEvent('stream_funded', { streamId, title }, userId);
          queryClient.invalidateQueries({ queryKey: ['streams'] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Failed to fund stream: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Fund stream: ${title}`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const pauseStreamMutation = useMutation({
    mutationFn: async ({ streamId, title }: { streamId: number; title: string }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `pause-${streamId}-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await pauseStreamOnChain(kit, address, streamId, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Stream "${title}" paused.`, 'warning');
          trackProductEvent('stream_paused', { streamId, title }, userId);
          queryClient.invalidateQueries({ queryKey: ['streams'] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Failed to pause stream: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Pause stream: ${title}`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const resumeStreamMutation = useMutation({
    mutationFn: async ({ streamId, title }: { streamId: number; title: string }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `resume-${streamId}-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await resumeStreamOnChain(kit, address, streamId, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Stream "${title}" resumed.`, 'success');
          trackProductEvent('stream_resumed', { streamId, title }, userId);
          queryClient.invalidateQueries({ queryKey: ['streams'] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Failed to resume stream: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Resume stream: ${title}`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const withdrawWagesMutation = useMutation({
    mutationFn: async ({ streamId, title }: { streamId: number; title: string }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `withdraw-${streamId}-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await withdrawWagesOnChain(kit, address, streamId, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Successfully claimed wages for: ${title}`, 'success');
          trackProductEvent('stream_withdrawn', { streamId, title }, userId);
          queryClient.invalidateQueries({ queryKey: ['streams'] });
          queryClient.invalidateQueries({ queryKey: ['loyaltyPoints', address] });
          queryClient.invalidateQueries({ queryKey: ['walletBalance', address] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Failed to withdraw wages: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Withdraw wages: ${title}`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  const raiseDisputeMutation = useMutation({
    mutationFn: async ({ streamId, title }: { streamId: number; title: string }) => {
      if (!isConnected || !address || !kit) {
        throw new Error('Wallet connection required.');
      }
      const txStoreId = `dispute-${streamId}-${Date.now()}`;

      const retryFn = async () => {
        useTxStore.getState().updateTransaction(txStoreId, { status: 'pending', error: undefined });
        try {
          const hash = await raiseDisputeOnChain(kit, address, streamId, txStoreId);
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'confirmed', 
            hash, 
            explorerLink: `https://stellar.expert/explorer/testnet/tx/${hash}` 
          });
          addToast(`Dispute raised on: ${title}. Wage stream is now locked!`, 'warning');
          queryClient.invalidateQueries({ queryKey: ['streams'] });
          queryClient.invalidateQueries({ queryKey: ['disputes'] });
          return hash;
        } catch (e: any) {
          useTxStore.getState().updateTransaction(txStoreId, { 
            status: 'failed', 
            error: e.message || String(e), 
            retryAction: retryFn 
          });
          addToast(`Failed to raise dispute: ${e.message}`, 'error');
          throw e;
        }
      };

      addTransaction({
        id: txStoreId,
        hash: null,
        status: 'pending',
        title: `Dispute stream: ${title}`,
        retryAction: retryFn,
      });

      return retryFn();
    },
  });

  return {
    streams: streamsQuery.data || [],
    isLoading: streamsQuery.isLoading,
    isError: streamsQuery.isError,
    refetchStreams: streamsQuery.refetch,
    createStream: createStreamMutation.mutateAsync,
    isCreating: createStreamMutation.isPending,
    fundStream: fundStreamMutation.mutateAsync,
    isFunding: fundStreamMutation.isPending,
    pauseStream: pauseStreamMutation.mutateAsync,
    isPausing: pauseStreamMutation.isPending,
    resumeStream: resumeStreamMutation.mutateAsync,
    isResuming: resumeStreamMutation.isPending,
    withdrawWages: withdrawWagesMutation.mutateAsync,
    isWithdrawing: withdrawWagesMutation.isPending,
    raiseDispute: raiseDisputeMutation.mutateAsync,
    isDisputing: raiseDisputeMutation.isPending,
  };
}
