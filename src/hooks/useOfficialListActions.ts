import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useOfficialLevels } from '@/hooks/useOfficialLevels';
import { useReliablePublish } from '@/hooks/useReliablePublish';
import { isAdmin } from '@/lib/admin';
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';

/**
 * Admin-only mutations to manage the official Color Slide progression list
 * (kind 30888, d="official-levels"). Each action republishes the full list
 * with updated `a` tags so addressable replacement handles reordering.
 *
 * Operates in *coordinate* space (`kind:pubkey:d`) — never event ids — so
 * the official list survives level edits.
 *
 * No-ops for non-admins. Callers should also hide the UI for non-admins via
 * `isAdmin(pubkey)` to avoid showing dead controls.
 */
export function useOfficialListActions() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const officialQuery = useOfficialLevels();
  const reliablePublish = useReliablePublish();
  const [isPending, setIsPending] = useState(false);

  const currentCoordinates = officialQuery.data?.orderedCoordinates ?? [];
  const canEdit = isAdmin(user?.pubkey);

  const republish = useCallback(
    async (nextCoords: string[], description: string) => {
      if (!canEdit) throw new Error('Only admins can edit the official list.');
      setIsPending(true);
      try {
        await reliablePublish(
          {
            kind: KINDS.OFFICIAL_LIST,
            content: '',
            tags: [
              ['d', TAGS.OFFICIAL_LIST_D],
              ['t', TAGS.APP],
              ['alt', `Color Slide official level progression (${GAME_URL})`],
              ...nextCoords.map((coord) => ['a', coord, '', 'level'] as string[]),
            ],
          },
          { description },
        );
        await queryClient.invalidateQueries({ queryKey: ['colorslide', 'levels', 'official'] });
      } finally {
        setIsPending(false);
      }
    },
    [canEdit, reliablePublish, queryClient],
  );

  return {
    canEdit,
    isPending,
    isOfficial: (coordinate: string) => currentCoordinates.includes(coordinate),
    addLevel: (coordinate: string) => {
      if (currentCoordinates.includes(coordinate)) return Promise.resolve();
      return republish(
        [...currentCoordinates, coordinate],
        `Add level to official list`,
      );
    },
    removeLevel: (coordinate: string) => {
      if (!currentCoordinates.includes(coordinate)) return Promise.resolve();
      return republish(
        currentCoordinates.filter((c) => c !== coordinate),
        `Remove level from official list`,
      );
    },
    move: (coordinate: string, direction: 'up' | 'down') => {
      const idx = currentCoordinates.indexOf(coordinate);
      if (idx === -1) return Promise.resolve();
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= currentCoordinates.length) return Promise.resolve();
      const next = [...currentCoordinates];
      [next[idx], next[target]] = [next[target], next[idx]];
      return republish(next, `Reorder official list (${direction})`);
    },
  };
}
