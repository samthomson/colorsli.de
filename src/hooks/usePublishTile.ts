import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReliablePublish } from '@/hooks/useReliablePublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { buildTileTemplate } from '@/lib/tileEvent';
import type { TileKind } from '@/lib/tile';

/**
 * Publish a single Color Slide tile event (kind 37284, addressable) to
 * the user's tile library. Fire-and-forget by design: the editor calls
 * it after adding an image / emoji to the level palette so the next
 * level can pick the same sprite from the library, but the level itself
 * doesn't depend on the publish succeeding (the level event embeds the
 * tile snapshot directly).
 *
 * Failures land in the global pending-events queue via `useReliablePublish`.
 *
 * When the user is logged out, the call resolves immediately with
 * `null` — the tile only lives on the in-memory palette, no library
 * entry is created.
 */
export function usePublishTile() {
  const reliablePublish = useReliablePublish();
  const queryClient = useQueryClient();
  const { user } = useCurrentUser();

  return useCallback(
    async (tile: TileKind) => {
      if (!user) return null;
      // Only image tiles get library entries. Color = hex (infinite,
      // free), emoji = universal Unicode (built-in picker is enough).
      if (tile.sprite.type !== 'image') return null;

      const template = buildTileTemplate(tile);
      const event = await reliablePublish(template, {
        description: `Save tile to library (${tile.label ?? tile.id})`,
      });
      await queryClient.invalidateQueries({
        queryKey: ['colorslide', 'tiles', user.pubkey],
      });
      return event;
    },
    [reliablePublish, queryClient, user],
  );
}
