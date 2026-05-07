import { useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import { ArcadePill, arcadePillIconSize } from '@/components/ArcadePill';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/useToast';
import { usePendingEvents } from '@/hooks/usePendingEvents';

/**
 * Top-bar badge that surfaces failed Nostr publishes.
 *
 * Renders nothing when the queue is empty. When non-empty, shows a count
 * and a popover with retry / dismiss buttons per entry. Visible to logged-in
 * users only — pending events are scoped to the current user's pubkey.
 */
export function PendingEventsBadge() {
  const { events, retry, dismiss, isRetrying } = usePendingEvents();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (events.length === 0) return null;

  const onRetry = async (id: string) => {
    setBusyId(id);
    try {
      await retry(id);
      toast({ title: 'Published', description: 'Pending event sent successfully.' });
    } catch (err) {
      toast({
        title: 'Retry failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <ArcadePill
          tone="amber"
          size="sm"
          aria-label={`${events.length} pending event${events.length === 1 ? '' : 's'}`}
          style={{ animationDelay: '0.7s' }}
        >
          <AlertTriangle
            className={`${arcadePillIconSize('sm')} drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]`}
          />
          {events.length} pending
        </ArcadePill>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-slate-200 px-3 py-2">
          <p className="text-sm font-semibold text-slate-900">Pending events</p>
          <p className="text-xs text-slate-500">
            Events that failed to publish. Retry to resend.
          </p>
        </div>
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="space-y-1 px-3 py-2">
              <p className="line-clamp-2 text-sm font-medium text-slate-800">{e.description}</p>
              <p className="text-xs text-slate-500">{e.lastError}</p>
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  disabled={isRetrying || busyId === e.id}
                  onClick={() => onRetry(e.id)}
                >
                  {busyId === e.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-slate-500 hover:text-slate-800"
                  onClick={() => dismiss(e.id)}
                >
                  <X className="h-3 w-3" />
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
