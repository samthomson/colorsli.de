import { cn } from '@/lib/utils';
import type { Board } from '@/lib/colorSlide';

type LevelPreviewProps = {
  board: Board;
  className?: string;
};

/** Tiny read-only thumbnail of a level board. Used in cards and editor. */
export function LevelPreview({ board, className }: LevelPreviewProps) {
  const cols = board[0]?.length ?? 0;

  return (
    <div
      className={cn('grid w-full max-w-xs gap-[2px] rounded-md bg-slate-200/40 p-1', className)}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-hidden
    >
      {board.flatMap((row, r) =>
        row.map((color, c) => (
          <div
            key={`${r}-${c}`}
            className={cn(
              'aspect-square rounded-full',
              color ? '' : 'border border-dashed border-slate-300/70 bg-transparent',
            )}
            style={color ? { backgroundColor: color } : undefined}
          />
        )),
      )}
    </div>
  );
}
