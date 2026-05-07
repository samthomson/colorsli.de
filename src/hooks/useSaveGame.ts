import { useNostr } from '@nostrify/react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { KINDS, TAGS } from '@/lib/constants';
import { EMPTY_SAVE_GAME, parseSaveGame, type SaveGame } from '@/lib/saveGame';

/**
 * Reads the current user's encrypted Color Slide save game (kind 30078,
 * d=colorslide-progress) and decrypts it with NIP-44.
 *
 * Returns the empty save game (no completions) when:
 *   - the user is logged out
 *   - no save event exists yet on the relay
 *   - the event content can't be decrypted (e.g. signer changed)
 *
 * The query key includes the pubkey so multiple accounts cached separately.
 */
export function useSaveGame(): UseQueryResult<SaveGame> {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();
  const pubkey = user?.pubkey;

  return useQuery<SaveGame>({
    queryKey: ['colorslide', 'save-game', pubkey ?? ''],
    enabled: Boolean(user),
    queryFn: async (c) => {
      if (!user || !pubkey) return EMPTY_SAVE_GAME;

      const events = await nostr.query(
        [{
          kinds: [KINDS.SAVE_GAME],
          authors: [pubkey],
          '#d': [TAGS.SAVE_GAME_D],
          limit: 1,
        }],
        { signal: c.signal },
      );
      const event = events
        .slice()
        .sort((a, b) => b.created_at - a.created_at)[0];
      if (!event) return EMPTY_SAVE_GAME;

      if (!user.signer.nip44) {
        // No way to decrypt without NIP-44; treat as empty (the user can still
        // play, completions will rebuild on the next clear).
        return EMPTY_SAVE_GAME;
      }
      try {
        const plaintext = await user.signer.nip44.decrypt(pubkey, event.content);
        return parseSaveGame(plaintext);
      } catch {
        return EMPTY_SAVE_GAME;
      }
    },
    // Save game changes only via our own writes; keep cache hot for the session.
    staleTime: 5 * 60 * 1000,
  });
}
