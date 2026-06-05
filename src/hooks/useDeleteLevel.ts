import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReliablePublish } from '@/hooks/useReliablePublish';
import { KINDS, TAGS } from '@/lib/constants';
import type { ParsedLevel } from '@/lib/levelEvent';

/**
 * Publishes a NIP-09 deletion request (kind 5) for one of the user's own
 * levels (kind 37283).
 *
 * The request references BOTH the addressable coordinate (`a` tag) and the
 * latest event id (`e` tag): the `a` tag tells relays/clients to drop every
 * revision of the level, while the `e` tag pins the specific event a relay
 * is most likely to be holding. A `k` tag names the kind being deleted, per
 * the NIP.
 *
 * Deletion is a *request*, not a guarantee — relays and clients that honour
 * NIP-09 will hide the level, but nothing on Nostr can force every relay to
 * forget it. We optimistically drop it from the local caches so it vanishes
 * from Discover immediately.
 *
 * Only the author can meaningfully delete a level: a kind-5 signed by anyone
 * else is ignored for events they didn't author.
 */
export function useDeleteLevel() {
  const reliablePublish = useReliablePublish();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const deleteLevel = useCallback(
    async (level: ParsedLevel) => {
      setIsPending(true);
      try {
        const event = await reliablePublish(
          {
            kind: KINDS.DELETION,
            content: 'Deleted a Color Slide level.',
            tags: [
              ['a', level.coordinate],
              ['e', level.id],
              ['k', String(KINDS.LEVEL)],
              ['t', TAGS.APP],
            ],
          },
          { description: `Delete level: ${level.title}` },
        );
        // Optimistically drop it from any cached level list (Discover feed,
        // etc.) so it disappears immediately. We deliberately don't refetch —
        // a relay that hasn't yet processed the kind-5 would just re-serve it.
        queryClient.setQueriesData<ParsedLevel[]>(
          { queryKey: ['colorslide', 'levels'] },
          (old) =>
            Array.isArray(old)
              ? old.filter((l) => l.coordinate !== level.coordinate)
              : old,
        );
        queryClient.setQueryData(['colorslide', 'level', level.coordinate], null);
        return event;
      } finally {
        setIsPending(false);
      }
    },
    [reliablePublish, queryClient],
  );

  return { deleteLevel, isPending };
}
