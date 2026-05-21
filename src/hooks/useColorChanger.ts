import { useCallback, useSyncExternalStore } from 'react';
import { colorChangerColorAt, type SpriteRef, type TileKind } from '@/lib/tile';

/**
 * Live current color for a "color changer" sprite tile (a tile that
 * cycles through several colors), scheduling a re-render at each
 * color-boundary so the cell can fade to the next value via CSS.
 *
 * Returns `null` for tiles that aren't color changers — callers should
 * fall back to `tileBackgroundColor(tile)` when this returns null:
 *
 *   const live = useColorChanger(tile);
 *   const bg = live ?? tileBackgroundColor(tile);
 *
 * Phase is derived from `Date.now()`, so every cell rendering the same
 * sprite is automatically in sync without shared state. Pair with a
 * CSS `transition: background-color` on the cell to smooth the snap.
 */
export function useColorChanger(tile: TileKind | null | undefined): string | null {
  const sprite: Extract<SpriteRef, { type: 'changer' }> | null =
    tile?.sprite.type === 'changer' ? tile.sprite : null;

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!sprite || sprite.values.length < 2 || sprite.periodMs <= 0) {
        return () => {};
      }
      let timer: number | undefined;
      const tick = () => {
        onChange();
        const now = Date.now();
        const remaining = sprite.periodMs - (now % sprite.periodMs);
        timer = window.setTimeout(tick, Math.max(16, remaining));
      };
      const now = Date.now();
      const initial = sprite.periodMs - (now % sprite.periodMs);
      timer = window.setTimeout(tick, Math.max(16, initial));
      return () => {
        if (timer !== undefined) window.clearTimeout(timer);
      };
    },
    [sprite],
  );

  const getSnapshot = useCallback(
    () => (sprite ? colorChangerColorAt(sprite, Date.now()) : null),
    [sprite],
  );

  const getServerSnapshot = useCallback(
    () => (sprite ? colorChangerColorAt(sprite, 0) : null),
    [sprite],
  );

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
