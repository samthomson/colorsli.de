import { cn } from '@/lib/utils';
import type { Board } from '@/lib/colorSlide';
import {
  lookupTile,
  tileBackgroundColor,
  type TileKind,
  type TilePalette,
} from '@/lib/tile';
import { TileSprite } from '@/components/TileSprite';
import { useColorChanger } from '@/hooks/useColorChanger';

type LevelPreviewProps = {
  board: Board;
  /**
   * Tile palette for resolving cell ids to sprites. Optional for backward
   * compatibility — when omitted, cells are treated as hex strings (which
   * is correct for legacy v1 boards). If passed, the preview renders via
   * `lookupTile` so image / emoji tiles render too.
   */
  tiles?: TilePalette;
  className?: string;
};

/** Tiny read-only thumbnail of a level board. Used in cards and editor. */
export function LevelPreview({ board, tiles, className }: LevelPreviewProps) {
  const cols = board[0]?.length ?? 0;

  return (
    <div
      className={cn('grid w-full max-w-xs gap-[2px] rounded-md bg-slate-200/40 p-1', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {board.flatMap((row, r) =>
        row.map((cellId, c) => {
          if (cellId === null) {
            return (
              <div
                key={`${r}-${c}`}
                className="aspect-square rounded-full border border-dashed border-slate-300/70 bg-transparent"
              />
            );
          }
          const tile: TileKind = tiles
            ? lookupTile(tiles, cellId)
            : { id: cellId, sprite: { type: 'color', value: cellId } };
          return <PreviewCell key={`${r}-${c}`} tile={tile} />;
        }),
      )}
    </div>
  );
}

function PreviewCell({ tile }: { tile: TileKind }) {
  const liveColor = useColorChanger(tile);
  const bg = liveColor ?? tileBackgroundColor(tile);
  return (
    <div
      className="relative aspect-square overflow-hidden rounded-full"
      style={{
        backgroundColor: bg,
        ...(liveColor !== null ? { transition: 'background-color 600ms ease-in-out' } : null),
      }}
    >
      <TileSprite tile={tile} />
    </div>
  );
}
