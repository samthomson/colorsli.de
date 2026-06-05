import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { KINDS, TAGS } from '@/lib/constants';
import { parseLevelEvent, type ParsedLevel } from '@/lib/levelEvent';
import { buildLevelCoordinate } from '@/lib/coordinate';

/**
 * Community-published Color Slide levels (kind 37283 addressable, with
 * #t colorslide-level).
 *
 * Returns parsed levels sorted newest-first, deduped by addressable
 * coordinate so each level appears at most once (most-recent revision
 * wins). Relays SHOULD already enforce addressable replacement, but we
 * dedupe client-side as defense-in-depth — and to handle late-arriving
 * older revisions during a refresh.
 */
export function useUserLevels(limit = 100) {
  const { nostr } = useNostr();

  return useQuery<ParsedLevel[]>({
    queryKey: ['colorslide', 'levels', 'community', limit],
    queryFn: async (c) => {
      const events = await nostr.query(
        [{ kinds: [KINDS.LEVEL], '#t': [TAGS.LEVEL], limit }],
        { signal: c.signal },
      );

      const latestByCoord = new Map<string, NostrEvent>();
      for (const ev of events) {
        const dTag = ev.tags.find(([n]) => n === 'd')?.[1];
        if (!dTag) continue;
        const coord = buildLevelCoordinate(ev.pubkey, dTag);
        const existing = latestByCoord.get(coord);
        if (!existing || ev.created_at > existing.created_at) {
          latestByCoord.set(coord, ev);
        }
      }

      const parsed = Array.from(latestByCoord.values())
        .map(parseLevelEvent)
        .filter((l): l is ParsedLevel => l !== null);
      parsed.sort((a, b) => b.event.created_at - a.event.created_at);
      return parsed;
    },
    // Prefetched at app root; keep hot for the session so navigating to
    // Discover reads from cache instantly instead of showing a skeleton.
    staleTime: 5 * 60 * 1000,
  });
}
