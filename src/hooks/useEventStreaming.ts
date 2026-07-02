import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchRecentEvents, StellarEvent } from '../services/stellar';
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
    refetchInterval: 4000, // Poll every 4 seconds for live updates
    staleTime: 2000,
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
    const type = evt.type.toLowerCase();
    const data = evt.data;
    if (!data) return;

    try {
      if (type === 'created') {
        const id = data[0]?.toString() || '?';
        const amount = data[3] ? (Number(data[3]) / 1e7).toFixed(2) : '0';
        addToast(`New wage stream #${id} created with ${amount} XLM!`, 'success');
      } else if (type === 'funded') {
        const id = data[0]?.toString() || '?';
        addToast(`Wage stream #${id} has been funded and is now active!`, 'success');
      } else if (type === 'paused') {
        const id = data[0]?.toString() || '?';
        addToast(`Wage stream #${id} was paused by the employer.`, 'warning');
      } else if (type === 'resumed') {
        const id = data[0]?.toString() || '?';
        addToast(`Wage stream #${id} has been resumed.`, 'success');
      } else if (type === 'withdrew') {
        const id = data[0]?.toString() || '?';
        const amount = data[2] ? (Number(data[2]) / 1e7).toFixed(2) : '0';
        addToast(`Contractor claimed ${amount} XLM wages from stream #${id}!`, 'info');
      } else if (type === 'disputed') {
        const id = data[0]?.toString() || '?';
        addToast(`Wage stream #${id} is disputed! Lock applied.`, 'error');
      } else if (type === 'resolved') {
        const id = data[0]?.toString() || '?';
        addToast(`Dispute resolved for stream #${id}! Funds split and unlocked.`, 'success');
      } else if (type === 'reward') {
        const points = data[1]?.toString() || '0';
        addToast(`Contractor awarded +${points} Loyalty Reward Points!`, 'info');
      }
    } catch (err) {
      console.warn('Failed to parse event for toast notification:', err);
    }
  };

  return {
    events,
    isLoading: eventsQuery.isLoading,
    refetchEvents: eventsQuery.refetch,
  };
}
