import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { KINDS, TAGS } from '@/lib/constants';
import { parseTileEvent, type ParsedTile } from '@/lib/tileEvent';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * The current user's tile library — every kind-37284 tile event they've
 * published, parsed and de-duped by d-tag (latest revision wins). Returns
 * an empty array when the user is logged out.
 *
 * The library backs the "pick from library" UI in the level editor.
 */
export function useTileLibrary() {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const pubkey = user?.pubkey;

  return useQuery<ParsedTile[]>({
    queryKey: ['colorslide', 'tiles', pubkey ?? null],
    enabled: Boolean(pubkey),
    queryFn: async (c) => {
      if (!pubkey) return [];
      const events = await nostr.query(
        [{ kinds: [KINDS.TILE], authors: [pubkey], '#t': [TAGS.TILE], limit: 500 }],
        { signal: c.signal },
      );

      const latestByD = new Map<string, NostrEvent>();
      for (const ev of events) {
        const d = ev.tags.find(([n]) => n === 'd')?.[1];
        if (!d) continue;
        const existing = latestByD.get(d);
        if (!existing || ev.created_at > existing.created_at) {
          latestByD.set(d, ev);
        }
      }

      const parsed = Array.from(latestByD.values())
        .map(parseTileEvent)
        .filter((t): t is ParsedTile => t !== null);
      parsed.sort((a, b) => b.event.created_at - a.event.created_at);
      return parsed;
    },
  });
}
