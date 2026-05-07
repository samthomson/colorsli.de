import { useMemo } from 'react';
import { useSaveGame } from '@/hooks/useSaveGame';

/**
 * Set of level *coordinates* (`kind:pubkey:d`) the current user has cleared,
 * derived from their encrypted save game (kind 30078). Drives the sequential
 * unlock UI in `/play` — does NOT touch the public kind-1 leaderboard events.
 *
 * Coordinates are used (not event ids) so that an unlock keeps applying when
 * the level author republishes a new revision.
 */
export function useCompletedLevels(): {
  completedCoordinates: Set<string>;
  isLoading: boolean;
} {
  const save = useSaveGame();
  const completedCoordinates = useMemo(
    () => new Set(save.data?.completed ?? []),
    [save.data?.completed],
  );
  return { completedCoordinates, isLoading: save.isLoading };
}
