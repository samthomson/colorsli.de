import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReliablePublish } from '@/hooks/useReliablePublish';
import { buildLevelTemplate } from '@/lib/levelEvent';
import type { Board } from '@/lib/colorSlide';
import type { TilePalette } from '@/lib/tile';

/**
 * Publishes a Color Slide level (kind 37283 addressable) through the
 * reliable publish chokepoint, so failures land in the pending-events queue.
 *
 * `tiles` is the palette covering every cell id used in `board`.
 * `buildLevelTemplate` prunes unused entries before publishing.
 *
 * Pass `existingDTag` to *edit* an already-published level — it reuses the
 * d-tag, which makes the publish a replacement of the previous revision.
 * Omit it to create a brand-new level (a random d-tag is generated).
 *
 * Invalidates the levels caches on success so the change appears in Discover
 * immediately rather than after the 60s staleTime.
 */
export function usePublishLevel() {
  const reliablePublish = useReliablePublish();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const publishLevel = useCallback(
    async (args: {
      title: string;
      board: Board;
      tiles: TilePalette;
      youtubeUrl?: string;
      existingDTag?: string;
    }) => {
      const template = buildLevelTemplate(args);
      setIsPending(true);
      try {
        const event = await reliablePublish(template, {
          description: args.existingDTag
            ? `Update level: ${args.title.trim()}`
            : `Publish level: ${args.title.trim()}`,
        });
        await queryClient.invalidateQueries({ queryKey: ['colorslide', 'levels'] });
        return event;
      } finally {
        setIsPending(false);
      }
    },
    [reliablePublish, queryClient],
  );

  return { publishLevel, isPending };
}
