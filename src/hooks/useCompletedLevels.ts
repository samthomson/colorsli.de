import { useMemo } from 'react';
import { useSaveGame } from '@/hooks/useSaveGame';

/**
 * Set of level event ids the current user has cleared, derived from their
 * encrypted save game (kind 30078). Drives the sequential unlock UI in
 * `/practice` — does NOT touch the public kind-1 leaderboard events.
 */
export function useCompletedLevels(): { completedIds: Set<string>; isLoading: boolean } {
  const save = useSaveGame();
  const completedIds = useMemo(
    () => new Set(save.data?.completed ?? []),
    [save.data?.completed],
  );
  return { completedIds, isLoading: save.isLoading };
}
