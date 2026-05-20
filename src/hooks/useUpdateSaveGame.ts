import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useReliablePublish } from '@/hooks/useReliablePublish';
import { useSaveGame } from '@/hooks/useSaveGame';
import { KINDS } from '@/lib/constants';
import { saveGameTags, serializeSaveGame, withCompletion } from '@/lib/saveGame';

/**
 * Records a level completion in the user's encrypted save game.
 *
 * Reads the current save (from cache, fetching if missing), inserts the
 * level *coordinate* (`kind:pubkey:d`), encrypts the new payload to self
 * via NIP-44, and publishes a fresh kind-30078 event (replaceable by
 * `(pubkey, kind, d)`).
 *
 * Coordinates (not event ids) are stored so unlocks survive level edits —
 * authors can republish a level and existing completions still count.
 *
 * Failures land in the pending-events queue via `useReliablePublish`, so the
 * user can retry from the badge in the top bar.
 */
export function useUpdateSaveGame() {
  const { user } = useCurrentUser();
  const saveQuery = useSaveGame();
  const reliablePublish = useReliablePublish();
  const queryClient = useQueryClient();

  return useCallback(
    async (args: { levelCoordinate: string; levelTitle: string }) => {
      if (!user) throw new Error('Log in to save progress.');
      if (!user.signer.nip44) {
        throw new Error('Your signer does not support NIP-44 encryption — please upgrade.');
      }

      const current = saveQuery.data ?? { completed: [] };
      const next = withCompletion(current, args.levelCoordinate);

      // Always (re)publish so the user's `lastUpdated` walks forward even if
      // the level was already in the list — keeps the relay record fresh.
      const ciphertext = await user.signer.nip44.encrypt(user.pubkey, serializeSaveGame(next));

      await reliablePublish(
        {
          kind: KINDS.SAVE_GAME,
          content: ciphertext,
          tags: saveGameTags(),
        },
        { description: `Save progress: ${args.levelTitle}` },
      );

      queryClient.setQueryData(['colorslide', 'save-game', user.pubkey], next);
      return next;
    },
    [user, saveQuery.data, reliablePublish, queryClient],
  );
}
