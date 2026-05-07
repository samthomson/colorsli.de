import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { KINDS, TAGS } from '@/lib/constants';

export type LevelLeaderboardEntry = {
  pubkey: string;
  score: number;
  seconds: number;
  moves: number;
  createdAt: number;
};

/**
 * Top scores for one level (highest-first), keyed by addressable
 * coordinate so leaderboards survive level edits.
 *
 * Best score per pubkey only; ties broken by faster time, then fewer moves.
 * Trust caveat: anyone can publish a kind 1 with these tags. The board is a
 * "trust the network" leaderboard for v1; documented in NIP.md.
 */
export function useLevelLeaderboard(levelCoordinate: string | undefined, limit = 100) {
  const { nostr } = useNostr();

  return useQuery<LevelLeaderboardEntry[]>({
    queryKey: ['colorslide', 'leaderboard', 'level', levelCoordinate ?? ''],
    enabled: Boolean(levelCoordinate),
    queryFn: async (c) => {
      if (!levelCoordinate) return [];

      const events = await nostr.query(
        [{
          kinds: [KINDS.COMPLETION],
          '#t': [TAGS.COMPLETION],
          '#a': [levelCoordinate],
          limit,
        }],
        { signal: c.signal },
      );

      const bestByPubkey = new Map<string, LevelLeaderboardEntry>();
      for (const ev of events) {
        const score = Number(ev.tags.find(t => t[0] === 'score')?.[1] ?? '0');
        if (!Number.isFinite(score)) continue;
        const seconds = Number(ev.tags.find(t => t[0] === 'time')?.[1] ?? '0');
        const moves = Number(ev.tags.find(t => t[0] === 'moves')?.[1] ?? '0');
        const entry: LevelLeaderboardEntry = {
          pubkey: ev.pubkey,
          score,
          seconds,
          moves,
          createdAt: ev.created_at,
        };
        const existing = bestByPubkey.get(ev.pubkey);
        if (!existing || isBetter(entry, existing)) bestByPubkey.set(ev.pubkey, entry);
      }

      return Array.from(bestByPubkey.values()).sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.seconds !== b.seconds) return a.seconds - b.seconds;
        return a.moves - b.moves;
      });
    },
  });
}

function isBetter(a: LevelLeaderboardEntry, b: LevelLeaderboardEntry): boolean {
  if (a.score !== b.score) return a.score > b.score;
  if (a.seconds !== b.seconds) return a.seconds < b.seconds;
  return a.moves < b.moves;
}
