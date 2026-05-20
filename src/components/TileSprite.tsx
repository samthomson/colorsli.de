import { cn } from '@/lib/utils';
import { TreasureChestIcon } from '@/components/TreasureChestIcon';
import type { TileKind } from '@/lib/tile';

type TileSpriteProps = {
  tile: TileKind | null | undefined;
  /** Extra classes for the overlay element (sizing, positioning hooks). */
  className?: string;
  /**
   * Make image sprites non-draggable (default true). The level editor and
   * game both want to drag the *cell*, not the image — the browser's
   * built-in image drag would otherwise hijack the gesture.
   */
  preventDrag?: boolean;
};

/**
 * Renders the non-color part of a tile sprite (image / emoji) as an
 * absolutely-positioned overlay. Color tiles normally render nothing —
 * their appearance comes from the parent cell's `background-color` (see
 * `tileBackgroundColor` in `src/lib/tile.ts`).
 *
 * Exception: color tiles with `behavior.type === 'treasure'` render a
 * treasure-chest silhouette tinted to the tile's hex (via `currentColor`).
 * The parent cell's background goes transparent in that case so the chest
 * shape, not a disc, is what the player sees.
 *
 * Always pair this overlay with a positioned parent whose box clips to
 * the circle shape (e.g. `rounded-full overflow-hidden`).
 */
export function TileSprite({ tile, className, preventDrag = true }: TileSpriteProps) {
  if (!tile) return null;
  const sprite = tile.sprite;
  switch (sprite.type) {
    case 'color':
      if (tile.behavior?.type === 'treasure') {
        return (
          <span
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 flex items-center justify-center',
              className,
            )}
            style={{ color: sprite.value }}
          >
            <TreasureChestIcon className="h-[88%] w-[88%]" />
          </span>
        );
      }
      return null;
    case 'image':
      return (
        <img
          src={sprite.url}
          alt={sprite.alt ?? tile.label ?? ''}
          className={cn(
            'pointer-events-none absolute inset-0 h-full w-full object-cover',
            className,
          )}
          draggable={preventDrag ? false : undefined}
          loading="lazy"
        />
      );
    case 'emoji':
      return (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center leading-none [container-type:inline-size]',
            className,
          )}
        >
          <span style={{ fontSize: '78cqi' }}>{sprite.value}</span>
        </span>
      );
  }
}
