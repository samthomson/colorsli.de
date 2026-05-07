import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import type { NostrEvent } from '@nostrify/nostrify';
import { ADMIN_PUBKEYS } from '@/lib/admin';
import { KINDS, TAGS } from '@/lib/constants';
import { parseLevelEvent, type ParsedLevel } from '@/lib/levelEvent';

export type OfficialLevelsResult = {
  /** Levels in play order, parsed and validated. */
  levels: ParsedLevel[];
  /** Raw e-tag list of official level event ids in play order. */
  orderedIds: string[];
  /** The list event itself (kind 30888), if found. */
  listEvent: NostrEvent | null;
};

/**
 * Reads the admin-curated official progression list.
 *
 * 1. Fetches kind 30888 from `ADMIN_PUBKEYS` only (NEVER trust the d-tag alone).
 * 2. Reads ordered `e` tags from the most recent valid list event.
 * 3. Fetches the referenced level events by id and returns them in order.
 */
export function useOfficialLevels() {
  const { nostr } = useNostr();

  return useQuery<OfficialLevelsResult>({
    queryKey: ['colorslide', 'levels', 'official', ADMIN_PUBKEYS.join(',')],
    queryFn: async (c) => {
      if (ADMIN_PUBKEYS.length === 0) {
        return { levels: [], orderedIds: [], listEvent: null };
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

      // Most recently published list wins.
      const listEvent = listEvents
        .slice()
        .sort((a, b) => b.created_at - a.created_at)[0] ?? null;

      const orderedIds: string[] = listEvent
        ? listEvent.tags.filter(t => t[0] === 'e' && typeof t[1] === 'string').map(t => t[1])
        : [];

      if (orderedIds.length === 0) {
        return { levels: [], orderedIds, listEvent };
      }

      const levelEvents = await nostr.query(
        [{ kinds: [KINDS.LEVEL], ids: orderedIds }],
        { signal: c.signal },
      );

      const byId = new Map<string, ParsedLevel>();
      for (const ev of levelEvents) {
        const parsed = parseLevelEvent(ev);
        if (parsed) byId.set(parsed.id, parsed);
      }

      const levels = orderedIds
        .map(id => byId.get(id))
        .filter((l): l is ParsedLevel => l !== undefined);

      return { levels, orderedIds, listEvent };
    },
  });
}
