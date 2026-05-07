import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KINDS, TAGS } from '@/lib/constants';
import { parseLevelEvent, type ParsedLevel } from '@/lib/levelEvent';

/**
 * Community-published Color Slide levels (kind 7283 with #t colorslide-level).
 *
 * Returns parsed levels sorted newest-first. Malformed events are dropped.
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
      const parsed = events
        .map(parseLevelEvent)
        .filter((l): l is ParsedLevel => l !== null);
      parsed.sort((a, b) => b.event.created_at - a.event.created_at);
      return parsed;
    },
  });
}
