import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRecentEvents, type StellarEvent } from '../services/stellar';
import { stroopsToXlm } from '../lib/stellar-events';
import { useToastStore } from '../store/useToastStore';
import { useWalletStore } from '../store/useWalletStore';

export function useEventStreaming() {
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();
  const { address } = useWalletStore();
  const [events, setEvents] = useState<StellarEvent[]>([]);
  const seenEventIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef<boolean>(true);

  const eventsQuery = useQuery<StellarEvent[]>({
    queryKey: ['recentEvents'],
    queryFn: fetchRecentEvents,
    refetchInterval: 4000,
    staleTime: 2000,
    retry: 2,
  });

  useEffect(() => {
    if (eventsQuery.data) {
      const newEvents = eventsQuery.data;
      setEvents(newEvents);

      let detectedNewEvent = false;

      // Check for new events
      for (const evt of newEvents) {
        if (!seenEventIds.current.has(evt.id)) {
          seenEventIds.current.add(evt.id);

          // Trigger toast notification if it's not the initial batch of old events
          if (!isInitialLoad.current) {
            detectedNewEvent = true;
            triggerEventToast(evt);
          }
        }
      }

      if (isInitialLoad.current && newEvents.length > 0) {
        isInitialLoad.current = false;
      }

      // If new events are detected, invalidate queries to synchronize state
      if (detectedNewEvent) {
        queryClient.invalidateQueries({ queryKey: ['streams'] });
        queryClient.invalidateQueries({ queryKey: ['disputes'] });
        if (address) {
          queryClient.invalidateQueries({ queryKey: ['loyaltyPoints', address] });
          queryClient.invalidateQueries({ queryKey: ['walletBalance', address] });
          queryClient.invalidateQueries({ queryKey: ['arbiterStake', address] });
          queryClient.invalidateQueries({ queryKey: ['arbiterActiveVotes', address] });
        }
      }
    }
  }, [eventsQuery.data, queryClient, address]);

  const triggerEventToast = (evt: StellarEvent) => {
    const data = evt.data;
    if (!data || !Array.isArray(data)) return;

    const variant = String(data[0]);

    try {
      switch (variant) {
        case 'StreamCreated': {
          const id = data[1]?.toString() || '?';
          const amount = stroopsToXlm(data[4]);
          addToast(`New wage stream #${id} created with ${amount} XLM!`, 'success');
          break;
        }
        case 'StreamFunded': {
          const id = data[1]?.toString() || '?';
          addToast(`Wage stream #${id} has been funded and is now active!`, 'success');
          break;
        }
        case 'StreamPaused': {
          const id = data[1]?.toString() || '?';
          addToast(`Wage stream #${id} was paused by the employer.`, 'warning');
          break;
        }
        case 'StreamResumed': {
          const id = data[1]?.toString() || '?';
          addToast(`Wage stream #${id} has been resumed.`, 'success');
          break;
        }
        case 'WagesWithdrawn': {
          const id = data[1]?.toString() || '?';
          const amount = stroopsToXlm(data[3]);
          addToast(`Contractor claimed ${amount} XLM wages from stream #${id}!`, 'info');
          break;
        }
        case 'DisputeRaised': {
          const id = data[1]?.toString() || '?';
          addToast(`Wage stream #${id} is disputed! Lock applied.`, 'error');
          break;
        }
        case 'StreamResolved': {
          const id = data[1]?.toString() || '?';
          addToast(`Dispute resolved for stream #${id}! Funds split and unlocked.`, 'success');
          break;
        }
        case 'DisputeResolved': {
          const id = data[1]?.toString() || '?';
          addToast(`Dispute #${id} resolved by arbiters.`, 'success');
          break;
        }
        case 'Reward': {
          const points = data[2]?.toString() || '0';
          addToast(`Contractor awarded +${points} Loyalty Reward Points!`, 'info');
          break;
        }
        case 'ArbiterStaked': {
          const amount = stroopsToXlm(data[2]);
          addToast(`Arbiter staked ${amount} XLM bond.`, 'info');
          break;
        }
        case 'DisputeRegistered': {
          const id = data[1]?.toString() || '?';
          addToast(`Dispute #${id} registered for arbitration.`, 'warning');
          break;
        }
      }
    } catch (err) {
      console.warn('Failed to parse event for toast notification:', err);
    }
  };

  return {
    events,
    isLoading: eventsQuery.isLoading,
    isFetching: eventsQuery.isFetching,
    isError: eventsQuery.isError,
    error: eventsQuery.error,
    refetchEvents: eventsQuery.refetch,
  };
}
