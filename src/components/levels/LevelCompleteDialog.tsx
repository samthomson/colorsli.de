import { ArrowRight, DoorOpen, RefreshCw, RotateCcw, XCircle } from 'lucide-react';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/scoring';

export type SaveStatus = 'idle' | 'pending' | 'success' | 'error';

type LevelCompleteDialogProps = {
  open: boolean;
  /** Display title for the just-cleared level (or "Practice" / similar). */
  levelTitle: string;
  /** Final stats to display. */
  result: { score: number; seconds: number; moves: number };

  /** Save-game write status. Omit in practice mode (nothing to save). */
  saveStatus?: SaveStatus;
  onRetrySave?: () => void;

  /** "Post to leaderboards" preference. Omit in practice mode (no level
   * coordinate to attach a kind-1 to). */
  shareEnabled?: boolean;
  onShareToggle?: (next: boolean) => void;

  /** When provided, primary CTA advances to the next level (level mode). */
  onAdvance?: () => void;
  /** When provided, primary CTA restarts on a fresh board (practice mode). */
  onPlayAgain?: () => void;
  /** Always-present secondary CTA — exit to the main menu. */
  onExit: () => void;
};

/**
 * Post-completion arcade modal. Hard-locked: the only way out is one of the
 * two CTAs (no X button, no escape, no outside click). Adapts to the calling
 * mode:
 *
 * - **Level mode** (LevelPlayer): shows save status (on error) + share toggle,
 *   primary CTA "Next Level" or none, secondary "Exit Game". The kind-1
 *   leaderboard publish does NOT fire on open — it kicks off after the user
 *   picks a CTA, so the toggle is meaningful right up until they leave.
 * - **Practice mode** (Practice): no save/share UI, primary CTA "Play Again"
 *   (regenerates a random board), secondary "Exit Game".
 */
export function LevelCompleteDialog({
  open,
  levelTitle,
  result,
  saveStatus,
  onRetrySave,
  shareEnabled,
  onShareToggle,
  onAdvance,
  onPlayAgain,
  onExit,
}: LevelCompleteDialogProps) {
  const showShare = onShareToggle !== undefined && shareEnabled !== undefined;
  const showSaveError =
    saveStatus === 'error' && onRetrySave !== undefined;

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="max-w-md gap-0 overflow-hidden border-4 border-white/85 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-0 shadow-[0_8px_50px_rgba(34,211,238,0.35),0_0_0_1px_rgba(15,23,42,0.05)]"
      >
        <div className="px-6 pt-7 pb-2 text-center">
          <p className="arcade-label text-[11px] text-slate-600/80">★ {levelTitle} ★</p>
          <DialogTitle asChild>
            <h2 className="brand-arcade-title mt-2 bg-clip-text text-transparent text-3xl leading-none sm:text-4xl">
              Level Completed
            </h2>
          </DialogTitle>
          <DialogDescription className="sr-only">
            You completed {levelTitle}
          </DialogDescription>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-4">
          <div className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-cyan-300/70 bg-white/80 p-4 shadow-[inset_0_0_30px_rgba(34,211,238,0.18)]">
            <ArcadeStat label="Score" value={result.score.toLocaleString()} highlight />
            <ArcadeStat label="Time" value={formatTime(result.seconds)} />
            <ArcadeStat label="Moves" value={String(result.moves)} />
          </div>

          {showSaveError && (
            <div className="flex items-center gap-2 rounded-xl border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              <span className="flex-1 font-bold">Couldn't save your run</span>
              <Button
                variant="outline"
                size="sm"
                onClick={onRetrySave}
                className="h-7 gap-1 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            </div>
          )}

          {showShare && (
            <label className="flex items-start gap-3 rounded-2xl border-2 border-dashed border-cyan-400/60 bg-cyan-50/70 px-4 py-3 transition-colors hover:bg-cyan-50">
              <Switch
                checked={shareEnabled}
                onCheckedChange={onShareToggle}
                aria-label="Post score to leaderboards"
                className="mt-0.5"
              />
              <span className="flex-1">
                <span className="arcade-label block text-[11px] text-cyan-900">
                  Post score to leaderboards
                </span>
                <span className="mt-0.5 block text-xs text-cyan-900/70">
                  Share your run publicly so you appear on the global + per-level scoreboards.
                </span>
              </span>
            </label>
          )}

          <div className="flex items-center justify-between gap-3 pt-1">
            <ArcadePill tone="slate" size="sm" onClick={onExit}>
              <ArcadePillIcon tone="slate" size="sm">
                <DoorOpen className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              Exit Game
            </ArcadePill>
            {onAdvance ? (
              <ArcadePill tone="cyan" size="md" onClick={onAdvance}>
                Next Level
                <ArrowRight className={arcadePillIconSize('md')} />
              </ArcadePill>
            ) : onPlayAgain ? (
              <ArcadePill tone="cyan" size="md" onClick={onPlayAgain}>
                <ArcadePillIcon tone="cyan" size="md">
                  <RotateCcw className={arcadePillIconSize('md')} />
                </ArcadePillIcon>
                Play Again
              </ArcadePill>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArcadeStat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="arcade-label text-[10px] text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-black tabular-nums',
          highlight ? 'text-emerald-700' : 'text-slate-900',
        )}
      >
        {value}
      </p>
    </div>
  );
}
