import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReliablePublish } from '@/hooks/useReliablePublish';
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';
import { formatTime } from '@/lib/scoring';

export type PublishCompletionArgs = {
  /** Addressable level coordinate (`kind:pubkey:d`). Stable across edits. */
  levelCoordinate: string;
  /** Display title of the level (used in the human summary). */
  levelTitle: string;
  /** Final score from `computeScore`. */
  score: number;
  /** Wall-clock seconds the player spent on the level. */
  seconds: number;
  /** Number of slide moves the player made. */
  moves: number;
};

/**
 * Publishes the public kind-1 leaderboard entry for one level completion.
 *
 * This is the **optional** half of completion handling — it runs when
 * `AppConfig.publishCompletions` is true. The private save game is updated
 * separately via `useUpdateSaveGame`, regardless of this setting.
 */
export function usePublishCompletion() {
  const reliablePublish = useReliablePublish();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const publishCompletion = useCallback(
    async (args: PublishCompletionArgs) => {
      const { levelCoordinate, levelTitle, score, seconds, moves } = args;
      const summary =
        `Completed "${levelTitle}" in Color Slide: ${score} pts, ` +
        `${formatTime(seconds)}, ${moves} moves. Play at ${GAME_URL}`;

      setIsPending(true);
      try {
        const event = await reliablePublish(
          {
            kind: KINDS.COMPLETION,
            content: summary,
            tags: [
              ['t', TAGS.APP],
              ['t', TAGS.COMPLETION],
              ['a', levelCoordinate, '', 'level'],
              ['score', String(score)],
              ['time', String(seconds)],
              ['moves', String(moves)],
              ['r', GAME_URL],
            ],
          },
          { description: `Share score: ${levelTitle} (${score} pts)` },
        );
        await queryClient.invalidateQueries({ queryKey: ['colorslide', 'leaderboard'] });
        return event;
      } finally {
        setIsPending(false);
      }
    },
    [reliablePublish, queryClient],
  );

  return { publishCompletion, isPending };
}
