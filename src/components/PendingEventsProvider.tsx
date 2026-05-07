import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNostr } from '@nostrify/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  PendingEventsContext,
  type PendingEvent,
  type PendingEventTemplate,
  type PendingEventsContextType,
} from '@/contexts/PendingEventsContext';

const STORAGE_KEY = 'colorslide:pending-events';

/**
 * Persistent queue of events that failed to publish.
 *
 * Each entry stores the *unsigned* event template, the owning pubkey, and the
 * last error. Retrying re-signs with the current user's signer and re-publishes
 * via the shared connection pool.
 *
 * The queue is shared across all logged-in users (one localStorage array) but
 * the `events` we expose is filtered to the current user — retries always use
 * the active signer, so showing other accounts' failures would be confusing.
 */
export function PendingEventsProvider({ children }: { children: ReactNode }) {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const [allEvents, setAllEvents] = useLocalStorage<PendingEvent[]>(STORAGE_KEY, []);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(() => new Set());

  const events = useMemo(
    () => (user ? allEvents.filter((e) => e.pubkey === user.pubkey) : []),
    [allEvents, user],
  );

  const enqueue = useCallback<PendingEventsContextType['enqueue']>(
    ({ template, description, error }) => {
      if (!user) return;
      const entry: PendingEvent = {
        id: crypto.randomUUID(),
        pubkey: user.pubkey,
        template,
        description,
        lastError: error instanceof Error ? error.message : String(error),
        failedAt: Math.floor(Date.now() / 1000),
      };
      setAllEvents((prev) => [...prev, entry]);
    },
    [user, setAllEvents],
  );

  const dismiss = useCallback<PendingEventsContextType['dismiss']>(
    (id) => setAllEvents((prev) => prev.filter((e) => e.id !== id)),
    [setAllEvents],
  );

  const clear = useCallback<PendingEventsContextType['clear']>(() => {
    if (!user) return;
    setAllEvents((prev) => prev.filter((e) => e.pubkey !== user.pubkey));
  }, [user, setAllEvents]);

  const setRetrying = useCallback((id: string, on: boolean) => {
    setRetryingIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const retry = useCallback<PendingEventsContextType['retry']>(
    async (id) => {
      if (!user) throw new Error('Log in to retry pending events.');
      const entry = allEvents.find((e) => e.id === id);
      if (!entry) return;
      if (entry.pubkey !== user.pubkey) {
        throw new Error('This pending event belongs to a different account.');
      }
      setRetrying(id, true);
      try {
        await publishTemplate(nostr, user, entry.template);
        setAllEvents((prev) => prev.filter((e) => e.id !== id));
      } catch (error) {
        setAllEvents((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, lastError: error instanceof Error ? error.message : String(error), failedAt: Math.floor(Date.now() / 1000) }
              : e,
          ),
        );
        throw error;
      } finally {
        setRetrying(id, false);
      }
    },
    [allEvents, nostr, setAllEvents, setRetrying, user],
  );

  const value: PendingEventsContextType = {
    events,
    enqueue,
    retry,
    dismiss,
    clear,
    isRetrying: retryingIds.size > 0,
  };

  return (
    <PendingEventsContext.Provider value={value}>
      {children}
    </PendingEventsContext.Provider>
  );
}

async function publishTemplate(
  nostr: ReturnType<typeof useNostr>['nostr'],
  user: NonNullable<ReturnType<typeof useCurrentUser>['user']>,
  template: PendingEventTemplate,
) {
  if (location.protocol === 'https:' && !template.tags.some(([n]) => n === 'client')) {
    template.tags.push(['client', location.hostname]);
  }
  const event = await user.signer.signEvent({
    kind: template.kind,
    content: template.content ?? '',
    tags: template.tags,
    created_at: template.created_at ?? Math.floor(Date.now() / 1000),
  });
  await nostr.event(event, { signal: AbortSignal.timeout(5000) });
  return event;
}
