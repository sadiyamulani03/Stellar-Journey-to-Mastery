'use client';

import React, { useState, useEffect } from 'react';
import { fetchRecentEvents, StellarEvent } from '../../services/stellar';
import { Activity, RefreshCw, PlusCircle, CheckCircle, ArrowRightLeft, XCircle, Settings } from 'lucide-react';

export default function ActivityPage() {
  const [events, setEvents] = useState<StellarEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const mockEvents: StellarEvent[] = [
    {
      id: 'event-1',
      contractId: 'CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ',
      type: 'released',
      timestamp: '07:22:15 PM',
      data: [BigInt(2), 'GBA24HODL...', BigInt(500000000)],
    },
    {
      id: 'event-2',
      contractId: 'CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ',
      type: 'funded',
      timestamp: '07:21:40 PM',
      data: [BigInt(2), 'GBH6XRNQ...', BigInt(500000000)],
    },
    {
      id: 'event-3',
      contractId: 'CCIWJOKEYK623T4O72D6Q3W4H5LSPYCRQ6Z47VQDTRMEYV3JCPXU636F',
      type: 'reward',
      timestamp: '07:20:10 PM',
      data: ['GBA24HODL...', BigInt(5), BigInt(20)],
    },
    {
      id: 'event-4',
      contractId: 'CA2CPOMEE7EBGSSVU62T6HLG44WDOVEZAGTQGVW3KGV6PJ62R765IJEJ',
      type: 'created',
      timestamp: '07:18:05 PM',
      data: [BigInt(2), 'GBH6XRNQ...', 'GBA24HODL...', BigInt(500000000)],
    }
  ];

  const loadEvents = async () => {
    setLoading(true);
    try {
      const chainEvents = await fetchRecentEvents();
      if (chainEvents && chainEvents.length > 0) {
        setEvents(chainEvents);
      } else {
        setEvents(mockEvents);
      }
    } catch (err) {
      console.warn('Failed to load events, using mocks:', err);
      setEvents(mockEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'created':
        return <PlusCircle className="h-5 w-5 text-yellow-400" />;
      case 'funded':
        return <ArrowRightLeft className="h-5 w-5 text-green-400" />;
      case 'released':
      case 'reward':
        return <CheckCircle className="h-5 w-5 text-accent animate-pulse" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Settings className="h-5 w-5 text-zinc-400" />;
    }
  };

  const formatEventData = (evt: StellarEvent) => {
    const { type, data } = evt;
    if (!data) return 'Event processed successfully.';

    try {
      if (type === 'created') {
        const id = data[0]?.toString() || '?';
        const employer = data[1]?.toString() || '';
        const contractor = data[2]?.toString() || '';
        const amount = data[3] ? (Number(data[3]) / 1e7).toFixed(2) : '0';
        return `Payroll Agreement #${id} created by Employer (${employer.substring(0, 6)}...) for Contractor (${contractor.substring(0, 6)}...) with value of ${amount} XLM.`;
      }
      if (type === 'funded') {
        const id = data[0]?.toString() || '?';
        const employer = data[1]?.toString() || '';
        const amount = data[2] ? (Number(data[2]) / 1e7).toFixed(2) : '0';
        return `Payroll Agreement #${id} funded with ${amount} XLM by Employer (${employer.substring(0, 6)}...).`;
      }
      if (type === 'released') {
        const id = data[0]?.toString() || '?';
        const contractor = data[1]?.toString() || '';
        const amount = data[2] ? (Number(data[2]) / 1e7).toFixed(2) : '0';
        return `Milestone Payment #${id} released! ${amount} XLM transferred to Contractor (${contractor.substring(0, 6)}...).`;
      }
      if (type === 'reward') {
        const user = data[0]?.toString() || '';
        const points = data[1]?.toString() || '0';
        const bal = data[2]?.toString() || '0';
        return `Loyalty Reward triggered: contractor (${user.substring(0, 6)}...) awarded ${points} LP (Total: ${bal} LP).`;
      }
      if (type === 'cancelled') {
        const id = data[0]?.toString() || '?';
        return `Agreement #${id} cancelled. Funds returned to Employer.`;
      }
    } catch (err) {
      console.warn('Failed parsing event args:', err);
    }
    return JSON.stringify(data);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-accent" />
            On-Chain Event Activity
          </h1>
          <p className="text-sm text-muted-foreground font-light">
            Real-time tracking of escrow status transitions and loyalty rewards distribution.
          </p>
        </div>
        
        <button
          onClick={loadEvents}
          disabled={loading}
          className="bg-zinc-900 hover:bg-zinc-800 border border-border p-2 rounded-lg text-muted-foreground hover:text-white transition-all flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 space-y-6">
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No recent blockchain events found.
          </div>
        ) : (
          <div className="relative border-l border-zinc-800 pl-6 space-y-8">
            {events.map((evt) => (
              <div key={evt.id} className="relative group">
                <div className="absolute -left-[35px] top-1.5 bg-zinc-950 border border-border p-1 rounded-full">
                  {getEventIcon(evt.type)}
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-accent uppercase tracking-wider">{evt.type}</span>
                    <span className="text-muted-foreground">{evt.timestamp}</span>
                  </div>
                  
                  <p className="text-sm text-white font-light leading-relaxed">
                    {formatEventData(evt)}
                  </p>
                  
                  <div className="text-xs text-muted-foreground flex gap-4">
                    <span>Contract: {evt.contractId.substring(0, 12)}...</span>
                    <span>Event ID: {evt.id.substring(0, 10)}...</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
