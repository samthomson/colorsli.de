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
 * with updated e-tags so the replacement semantics handle reordering.
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

  const currentIds = officialQuery.data?.orderedIds ?? [];
  const canEdit = isAdmin(user?.pubkey);

  const republish = useCallback(
    async (nextIds: string[], description: string) => {
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
              ...nextIds.map((id) => ['e', id, '', 'level'] as string[]),
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
    isOfficial: (eventId: string) => currentIds.includes(eventId),
    addLevel: (eventId: string) => {
      if (currentIds.includes(eventId)) return Promise.resolve();
      return republish([...currentIds, eventId], `Add level to official list (${eventId.slice(0, 8)})`);
    },
    removeLevel: (eventId: string) => {
      if (!currentIds.includes(eventId)) return Promise.resolve();
      return republish(
        currentIds.filter((id) => id !== eventId),
        `Remove level from official list (${eventId.slice(0, 8)})`,
      );
    },
    move: (eventId: string, direction: 'up' | 'down') => {
      const idx = currentIds.indexOf(eventId);
      if (idx === -1) return Promise.resolve();
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target < 0 || target >= currentIds.length) return Promise.resolve();
      const next = [...currentIds];
      [next[idx], next[target]] = [next[target], next[idx]];
      return republish(next, `Reorder official list (${direction})`);
    },
  };
}
