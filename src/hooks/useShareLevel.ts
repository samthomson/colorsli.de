import { useCallback } from 'react';
import { nip19 } from 'nostr-tools';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { KINDS } from '@/lib/constants';
import type { ParsedLevel } from '@/lib/levelEvent';

/**
 * Hook to share a Color Slide level as a kind 1 note.
 * Works for any level - ones you created or discovered.
 */
export function useShareLevel() {
  const { user } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();

  const shareLevel = useCallback(
    async (level: ParsedLevel) => {
      if (!user) {
        throw new Error('Must be logged in to share');
      }

      const naddr = nip19.naddrEncode({
        identifier: level.dTag,
        pubkey: level.pubkey,
        kind: KINDS.LEVEL,
      });
      const levelUrl = `${window.location.origin}/${naddr}`;
      
      const content = `Check out this Color Slide level: "${level.title}"

${levelUrl}

#colorslide`;

      await publishEvent({
        kind: 1,
        content,
        tags: [
          ['t', 'colorslide'],
          ['a', level.coordinate, '', 'level'],
          ['r', levelUrl],
        ],
      });
    },
    [user, publishEvent],
  );

  return { shareLevel, isPending };
}