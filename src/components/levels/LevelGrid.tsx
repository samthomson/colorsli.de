import { Lock, CheckCircle2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LevelPreview } from '@/components/levels/LevelPreview';
import type { ParsedLevel } from '@/lib/levelEvent';

type LevelGridProps = {
  levels: ParsedLevel[];
  completedIds: Set<string>;
  onSelect: (level: ParsedLevel) => void;
};

/**
 * Sequential level picker.
 *
 * Levels appear in `levels` order. A level is unlocked iff it's the first
 * level OR the previous level is in `completedIds`. Completed levels can be
 * replayed for a higher score.
 */
export function LevelGrid({ levels, completedIds, onSelect }: LevelGridProps) {
  if (levels.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300/80 bg-white/60 p-8 text-center text-slate-700">
        <p className="text-sm font-semibold">No official levels yet.</p>
        <p className="mt-1 text-xs text-slate-600">
          Once an admin curates levels, they will appear here in order.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {levels.map((level, index) => {
        const completed = completedIds.has(level.id);
        const prev = levels[index - 1];
        const unlocked = index === 0 || completed || (prev ? completedIds.has(prev.id) : false);

        return (
          <button
            key={level.id}
            type="button"
            onClick={() => unlocked && onSelect(level)}
            disabled={!unlocked}
            className={cn(
              'group flex flex-col gap-3 rounded-2xl border-2 bg-white/70 p-4 text-left shadow-sm transition-all backdrop-blur',
              unlocked
                ? 'border-cyan-300/70 hover:scale-[1.02] hover:border-cyan-400 hover:shadow-md'
                : 'cursor-not-allowed border-slate-200/70 opacity-70',
            )}
            aria-disabled={!unlocked}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-slate-500">
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
            <h3 className="line-clamp-2 text-base font-bold text-slate-900">{level.title}</h3>
            <LevelPreview board={level.board} className="max-w-full" />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{level.rows}x{level.cols}</span>
              <span>{completed ? 'Replay for higher score' : unlocked ? 'Tap to play' : 'Locked'}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
