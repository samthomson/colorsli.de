import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReliablePublish } from '@/hooks/useReliablePublish';
import { buildLevelTemplate } from '@/lib/levelEvent';
import type { Board } from '@/lib/colorSlide';

/**
 * Publishes a Color Slide level event (kind 7283) through the reliable
 * publish chokepoint, so failures land in the pending-events queue.
 *
 * Invalidates the community-levels query on success so a freshly published
 * level appears in Discover immediately rather than after the 60s staleTime.
 */
export function usePublishLevel() {
  const reliablePublish = useReliablePublish();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const publishLevel = useCallback(
    async (args: { title: string; board: Board; youtubeUrl?: string }) => {
      const template = buildLevelTemplate(args);
      setIsPending(true);
      try {
        const event = await reliablePublish(template, {
          description: `Publish level: ${args.title.trim()}`,
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
