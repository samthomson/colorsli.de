import { useCallback } from 'react';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { usePendingEvents } from '@/hooks/usePendingEvents';
import type { PendingEventTemplate } from '@/contexts/PendingEventsContext';

export type ReliablePublishOptions = {
  /** Human-readable label that appears in the pending-events UI on failure. */
  description: string;
};

/**
 * Single chokepoint for every Nostr publish in the app.
 *
 * Tries to sign + send via `useNostrPublish`. On failure, the unsigned
 * template lands in the persistent pending queue so the user can retry it
 * from the badge in the top bar.
 */
export function useReliablePublish() {
  const publish = useNostrPublish();
  const { enqueue } = usePendingEvents();

  return useCallback(
    async (template: PendingEventTemplate, opts: ReliablePublishOptions) => {
      try {
        return await publish.mutateAsync(template);
      } catch (error) {
        enqueue({ template, description: opts.description, error });
        throw error;
      }
    },
    [publish, enqueue],
  );
}
