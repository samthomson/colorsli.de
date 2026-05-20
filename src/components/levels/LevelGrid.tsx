import { Lock, CheckCircle2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LevelPreview } from '@/components/levels/LevelPreview';
import type { ParsedLevel } from '@/lib/levelEvent';

type LevelGridProps = {
  levels: ParsedLevel[];
  /** Set of level coordinates the user has cleared (`kind:pubkey:d`). */
  completedCoordinates: Set<string>;
  onSelect: (level: ParsedLevel) => void;
};

/**
 * Sequential level picker.
 *
 * Levels appear in `levels` order. A level is unlocked iff it's the first
 * level OR the previous level is in `completedCoordinates`. Completed
 * levels can be replayed for a higher score.
 *
 * Typography uses the shared arcade classes (`arcade-label`,
 * `brand-arcade-title`) so cards feel like game cabinet panels rather than
 * generic web cards. Unlocked cards get the `cursor-arcade-play` cursor.
 */
export function LevelGrid({ levels, completedCoordinates, onSelect }: LevelGridProps) {
  if (levels.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300/80 bg-white/60 p-8 text-center text-slate-700">
        <p className="arcade-label text-sm">No official levels yet.</p>
        <p className="mt-2 text-xs text-slate-600">
          Once an admin curates levels, they will appear here in order.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {levels.map((level, index) => {
        const completed = completedCoordinates.has(level.coordinate);
        const prev = levels[index - 1];
        const unlocked =
          index === 0 ||
          completed ||
          (prev ? completedCoordinates.has(prev.coordinate) : false);

        return (
          <button
            key={level.coordinate}
            type="button"
            onClick={() => unlocked && onSelect(level)}
            disabled={!unlocked}
            className={cn(
              'group flex flex-col gap-3 rounded-2xl border-2 bg-white/70 p-4 text-left shadow-sm transition-all backdrop-blur',
              unlocked
                ? 'cursor-arcade-play border-cyan-300/70 hover:scale-[1.02] hover:-rotate-[0.6deg] hover:border-cyan-400 hover:shadow-[0_8px_24px_rgba(34,211,238,0.35)]'
                : 'cursor-not-allowed border-slate-200/70 opacity-70',
            )}
            aria-disabled={!unlocked}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="arcade-label text-[11px] text-slate-500">
                Level {index + 1}
              </span>
              {completed ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : unlocked ? (
                <Play className="h-5 w-5 text-cyan-600" />
              ) : (
                <Lock className="h-5 w-5 text-slate-400" />
              )}
            </div>
            <h3 className="brand-arcade-title bg-clip-text text-transparent line-clamp-2 text-xl leading-tight sm:text-2xl">
              {level.title}
            </h3>
            <LevelPreview board={level.board} tiles={level.tiles} className="max-w-full" />
            <div className="flex items-center justify-between">
              <span className="arcade-label text-[10px] text-slate-500">
                {level.rows}x{level.cols}
              </span>
              <span className="arcade-label text-[10px] text-slate-500">
                {completed ? 'Replay ↑' : unlocked ? 'Tap to play' : 'Locked'}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
