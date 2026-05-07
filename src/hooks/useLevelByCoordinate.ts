import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KINDS } from '@/lib/constants';
import { parseCoordinate } from '@/lib/coordinate';
import { parseLevelEvent, type ParsedLevel } from '@/lib/levelEvent';

/**
 * Fetches the latest revision of a single level by its addressable
 * coordinate (`kind:pubkey:d`). Returns null if the coordinate is
 * malformed, refers to a non-level kind, or no event is found.
 *
 * Used by the level editor when loading a level for editing — the URL
 * carries the coordinate via an naddr query param, this hook resolves it.
 */
export function useLevelByCoordinate(coordinate: string | undefined) {
  const { nostr } = useNostr();

  return useQuery<ParsedLevel | null>({
    queryKey: ['colorslide', 'level', coordinate ?? ''],
    enabled: Boolean(coordinate),
    queryFn: async (c) => {
      if (!coordinate) return null;
      const parsed = parseCoordinate(coordinate);
      if (!parsed || parsed.kind !== KINDS.LEVEL) return null;

      const events = await nostr.query(
        [{
          kinds: [KINDS.LEVEL],
          authors: [parsed.pubkey],
          '#d': [parsed.dTag],
          limit: 1,
        }],
        { signal: c.signal },
      );

      const latest = events
        .slice()
        .sort((a, b) => b.created_at - a.created_at)[0];
      return latest ? parseLevelEvent(latest) : null;
    },
  });
}
