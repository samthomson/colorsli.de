import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KINDS, TAGS } from '@/lib/constants';

export type GlobalLeaderboardEntry = {
  pubkey: string;
  /** Sum of the player's best score on each level. */
  totalScore: number;
  /** Number of distinct levels they have a best score for. */
  levelsCompleted: number;
};

/**
 * Aggregate leaderboard across all levels.
 *
 * For each (pubkey, level) we keep the player's best score; the per-pubkey
 * best scores are then summed and sorted desc.
 */
export function useGlobalLeaderboard(limit = 1000) {
  const { nostr } = useNostr();

  return useQuery<GlobalLeaderboardEntry[]>({
    queryKey: ['colorslide', 'leaderboard', 'global', limit],
    queryFn: async (c) => {
      const events = await nostr.query(
        [{
          kinds: [KINDS.COMPLETION],
          '#t': [TAGS.COMPLETION],
          limit,
        }],
        { signal: c.signal },
      );

      // pubkey -> levelEventId -> best score
      const bestPerPlayerLevel = new Map<string, Map<string, number>>();

      for (const ev of events) {
        const levelId = ev.tags.find(t => t[0] === 'e' && typeof t[1] === 'string')?.[1];
        if (!levelId) continue;
        const score = Number(ev.tags.find(t => t[0] === 'score')?.[1] ?? '0');
        if (!Number.isFinite(score)) continue;

        let perLevel = bestPerPlayerLevel.get(ev.pubkey);
        if (!perLevel) {
          perLevel = new Map();
          bestPerPlayerLevel.set(ev.pubkey, perLevel);
        }
        const existing = perLevel.get(levelId) ?? -Infinity;
        if (score > existing) perLevel.set(levelId, score);
      }

      const totals: GlobalLeaderboardEntry[] = [];
      for (const [pubkey, perLevel] of bestPerPlayerLevel.entries()) {
        let totalScore = 0;
        for (const v of perLevel.values()) totalScore += v;
        totals.push({ pubkey, totalScore, levelsCompleted: perLevel.size });
      }

      totals.sort((a, b) => b.totalScore - a.totalScore);
      return totals;
    },
  });
}
