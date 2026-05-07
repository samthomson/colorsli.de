import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { ADMIN_PUBKEYS } from '@/lib/admin';
import { KINDS, TAGS } from '@/lib/constants';
import { parseLevelEvent, type ParsedLevel } from '@/lib/levelEvent';
import { buildLevelCoordinate, parseCoordinate } from '@/lib/coordinate';

export type OfficialLevelsResult = {
  /** Levels in play order (latest revision per coordinate), parsed and validated. */
  levels: ParsedLevel[];
  /** Raw a-tag list of official level coordinates in play order. */
  orderedCoordinates: string[];
  /** The list event itself (kind 30888), if found. */
  listEvent: NostrEvent | null;
};

/**
 * Reads the admin-curated official progression list.
 *
 * 1. Fetches kind 30888 from `ADMIN_PUBKEYS` only (NEVER trust the d-tag alone).
 * 2. Reads ordered `a` tags from the most recent valid list event — each
 *    `a` value is a `(kind, pubkey, d)` coordinate identifying a level.
 * 3. Resolves each coordinate to the latest revision of the level by
 *    querying `(kind, authors, #d)` and deduping client-side.
 */
export function useOfficialLevels() {
  const { nostr } = useNostr();

  return useQuery<OfficialLevelsResult>({
    queryKey: ['colorslide', 'levels', 'official', ADMIN_PUBKEYS.join(',')],
    queryFn: async (c) => {
      if (ADMIN_PUBKEYS.length === 0) {
        return { levels: [], orderedCoordinates: [], listEvent: null };
      }

      const listEvents = await nostr.query(
        [{
          kinds: [KINDS.OFFICIAL_LIST],
          authors: [...ADMIN_PUBKEYS],
          '#d': [TAGS.OFFICIAL_LIST_D],
          limit: ADMIN_PUBKEYS.length,
        }],
        { signal: c.signal },
      );

      const listEvent = listEvents
        .slice()
        .sort((a, b) => b.created_at - a.created_at)[0] ?? null;

      const orderedCoordinates: string[] = listEvent
        ? listEvent.tags
            .filter(t => t[0] === 'a' && typeof t[1] === 'string')
            .map(t => t[1])
        : [];

      if (orderedCoordinates.length === 0) {
        return { levels: [], orderedCoordinates, listEvent };
      }

      const parsed = orderedCoordinates
        .map(parseCoordinate)
        .filter((c): c is NonNullable<ReturnType<typeof parseCoordinate>> => c !== null)
        .filter(c => c.kind === KINDS.LEVEL);

      const authors = Array.from(new Set(parsed.map(c => c.pubkey)));
      const dTags = Array.from(new Set(parsed.map(c => c.dTag)));

      const levelEvents = await nostr.query(
        [{ kinds: [KINDS.LEVEL], authors, '#d': dTags }],
        { signal: c.signal },
      );

      // Filter to (author, d) pairs we actually requested, then keep the
      // most recent revision per coordinate.
      const wanted = new Set(parsed.map(p => `${p.pubkey}:${p.dTag}`));
      const latestByCoord = new Map<string, NostrEvent>();
      for (const ev of levelEvents) {
        const dTag = ev.tags.find(([n]) => n === 'd')?.[1];
        if (!dTag || !wanted.has(`${ev.pubkey}:${dTag}`)) continue;
        const coord = buildLevelCoordinate(ev.pubkey, dTag);
        const existing = latestByCoord.get(coord);
        if (!existing || ev.created_at > existing.created_at) {
          latestByCoord.set(coord, ev);
        }
      }

      const levels = orderedCoordinates
        .map(coord => latestByCoord.get(coord))
        .filter((ev): ev is NostrEvent => ev !== undefined)
        .map(parseLevelEvent)
        .filter((l): l is ParsedLevel => l !== null);

      return { levels, orderedCoordinates, listEvent };
    },
  });
}
