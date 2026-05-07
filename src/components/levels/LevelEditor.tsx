import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eraser, Minus, Music2, Plus, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/useToast';
import { usePublishLevel } from '@/hooks/usePublishLevel';
import { cn } from '@/lib/utils';
import { COLORS, emptyBoard, validateLevel, type Board, type Color } from '@/lib/colorSlide';
import { extractYouTubeId } from '@/lib/youtube';
import type { ParsedLevel } from '@/lib/levelEvent';

const MIN_DIM = 4;
const MAX_DIM = 12;
const DEFAULT_DIM = 6;

type LevelEditorProps = {
  /**
   * If provided, the editor opens in *edit mode*: fields are pre-filled
   * from this level, and publishing replaces the level (reuses the d-tag)
   * rather than creating a new one. Author should already be checked by
   * the caller — only the level's author can replace it.
   */
  initial?: ParsedLevel;
};

/**
 * Paint-style level editor — also handles editing an existing level when
 * `initial` is passed.
 *
 * - Adjust rows/cols with +/- steppers.
 * - Pick a color (or eraser) and click cells to paint.
 * - Live validation panel surfaces blocked cells (5+ runs) and color counts
 *   that aren't multiples of 4. Publish is disabled until the level is valid.
 */
export function LevelEditor({ initial }: LevelEditorProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { publishLevel, isPending } = usePublishLevel();

  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? '');
  const [rows, setRows] = useState(initial?.rows ?? DEFAULT_DIM);
  const [cols, setCols] = useState(initial?.cols ?? DEFAULT_DIM);
  const [board, setBoard] = useState<Board>(
    () => initial?.board ?? emptyBoard(DEFAULT_DIM, DEFAULT_DIM),
  );
  const [activeColor, setActiveColor] = useState<Color>(COLORS[0]);
  // The first cell pressed in a stroke determines the action for the whole
  // stroke, so dragging stays consistent:
  //   - 'paint': set every dragged cell to `target` (works for the eraser too,
  //     since target=null means erase)
  //   - 'erase-same': clicking a cell that already matches the brush toggles
  //     it off; only same-colored cells encountered during drag are erased.
  type StrokeAction =
    | { mode: 'paint'; target: Color }
    | { mode: 'erase-same'; target: string };
  const paintingRef = useRef<StrokeAction | null>(null);

  const validation = useMemo(() => validateLevel(board), [board]);
  const trimmedTitle = title.trim();
  const trimmedYoutube = youtubeUrl.trim();
  const youtubeValid = trimmedYoutube === '' || extractYouTubeId(trimmedYoutube) !== null;
  const canPublish = validation.isValid && trimmedTitle.length > 0 && youtubeValid;

  const resizeBoard = (nextRows: number, nextCols: number) => {
    setRows(nextRows);
    setCols(nextCols);
    setBoard((prev) => {
      const next = emptyBoard(nextRows, nextCols);
      const r = Math.min(prev.length, nextRows);
      for (let i = 0; i < r; i++) {
        const c = Math.min(prev[i].length, nextCols);
        for (let j = 0; j < c; j++) next[i][j] = prev[i][j];
      }
      return next;
    });
  };

  const setCell = (r: number, c: number, value: Color) => {
    setBoard((prev) => {
      if (prev[r][c] === value) return prev;
      const next = prev.map(row => [...row]);
      next[r][c] = value;
      return next;
    });
  };

  const handleCellPress = (r: number, c: number) => {
    const current = board[r][c];
    if (activeColor !== null && current === activeColor) {
      paintingRef.current = { mode: 'erase-same', target: activeColor };
      setCell(r, c, null);
    } else {
      paintingRef.current = { mode: 'paint', target: activeColor };
      setCell(r, c, activeColor);
    }
  };
  const handleCellEnter = (r: number, c: number) => {
    const action = paintingRef.current;
    if (!action) return;
    if (action.mode === 'erase-same') {
      if (board[r][c] === action.target) setCell(r, c, null);
    } else {
      setCell(r, c, action.target);
    }
  };
  const endStroke = () => {
    paintingRef.current = null;
  };

  const isBlocked = (r: number, c: number) =>
    validation.blockedCells.some(b => b.row === r && b.col === c);

  const onPublish = async () => {
    if (!canPublish) return;
    try {
      await publishLevel({
        title: trimmedTitle,
        board,
        youtubeUrl: trimmedYoutube || undefined,
        existingDTag: initial?.dTag,
      });
      toast({
        title: isEdit ? 'Level updated' : 'Level published',
        description: isEdit
          ? 'Your changes are live for everyone.'
          : 'Your level is now in Discover.',
      });
      navigate('/discover');
    } catch (err) {
      console.error('Failed to publish level', err);
      toast({
        title: isEdit ? 'Could not update level' : 'Could not publish level',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const cellSizePx = Math.min(48, Math.floor(360 / Math.max(cols, 1)));

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader className="space-y-3">
        <CardTitle className="brand-arcade-title bg-clip-text text-transparent text-3xl leading-none sm:text-4xl">
          {isEdit ? 'Edit Level' : 'Level Editor'}
        </CardTitle>
        <p className="arcade-label text-[10px] tracking-[0.18em] text-muted-foreground">
          {isEdit
            ? 'Update this level. Republishing replaces the previous revision so existing unlocks and leaderboard entries carry over.'
            : 'Paint colored cells to design a level. Each color must appear in groups of 4 (no exact 5+ runs). Publish to share with the community.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="md:col-span-3">
            <span className="arcade-label mb-1 block text-[11px] text-slate-600">
              Title <span className="text-red-500">*</span>
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={64}
              required
              aria-invalid={trimmedTitle.length === 0}
            />
          </label>

          <label className="md:col-span-3">
            <span className="arcade-label mb-1 flex items-center gap-1.5 text-[11px] text-slate-600">
              <Music2 className="h-3.5 w-3.5" />
              Background music (YouTube URL, optional)
            </span>
            <Input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtu.be/jfKfPfyJRdk"
              aria-invalid={trimmedYoutube !== '' && !youtubeValid}
            />
            {trimmedYoutube !== '' && !youtubeValid && (
              <span className="arcade-label mt-1 block text-[10px] text-red-600">
                Doesn't look like a YouTube link.
              </span>
            )}
          </label>

          <Stepper label="Rows" value={rows} min={MIN_DIM} max={MAX_DIM} onChange={(v) => resizeBoard(v, cols)} />
          <Stepper label="Cols" value={cols} min={MIN_DIM} max={MAX_DIM} onChange={(v) => resizeBoard(rows, v)} />
          <div className="rounded-md border border-dashed border-slate-300 px-3 py-2">
            <p className="arcade-label text-[11px] text-slate-500">Board</p>
            <p className="arcade-label mt-1 text-[10px] text-slate-600">
              {rows} x {cols} ({rows * cols} cells)
            </p>
          </div>
        </div>

        <div>
          <p className="arcade-label mb-2 text-[11px] text-slate-600">Palette</p>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setActiveColor(color)}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition-all',
                  activeColor === color
                    ? 'scale-110 border-slate-900 shadow-md'
                    : 'border-white/60 hover:scale-105',
                )}
                style={{ backgroundColor: color }}
                aria-label={`Paint with ${color}`}
                aria-pressed={activeColor === color}
              />
            ))}
            <button
              type="button"
              onClick={() => setActiveColor(null)}
              className={cn(
                'arcade-label flex h-9 items-center gap-1 rounded-full border-2 px-3 text-[10px] transition-all',
                activeColor === null
                  ? 'scale-110 border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-300 text-slate-600 hover:scale-105',
              )}
              aria-pressed={activeColor === null}
            >
              <Eraser className="h-4 w-4" />
              Erase
            </button>
          </div>
        </div>

        {validation.blockedCells.length > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            <span className="text-lg font-bold">!</span>
            <p className="arcade-label text-[11px]">
              5+ in a row detected — colors must form exact groups of 4.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto,1fr]">
          <div
            className="select-none rounded-xl bg-slate-100/70 p-2"
            onMouseUp={endStroke}
            onMouseLeave={endStroke}
            onTouchEnd={endStroke}
          >
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${cols}, ${cellSizePx}px)` }}
            >
              {board.flatMap((row, r) =>
                row.map((cell, c) => {
                  const blocked = isBlocked(r, c);
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleCellPress(r, c); }}
                      onMouseEnter={() => handleCellEnter(r, c)}
                      onTouchStart={(e) => { e.preventDefault(); handleCellPress(r, c); }}
                      className={cn(
                        'relative rounded-full border-2 border-transparent transition-all',
                        cell ? '' : 'border-dashed border-slate-300 bg-transparent',
                        blocked && 'ring-2 ring-red-500 ring-offset-1 animate-pulse',
                      )}
                      style={{
                        width: cellSizePx,
                        height: cellSizePx,
                        backgroundColor: cell ?? 'transparent',
                      }}
                      aria-label={`Cell ${r + 1}-${c + 1}${cell ? '' : ' (empty)'}${blocked ? ' (part of a 5+ run)' : ''}`}
                    >
                      {blocked && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                          !
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
              <p className="arcade-label mb-2 text-[11px] text-slate-600">Validation</p>
              {Object.keys(validation.colorCounts).length === 0 ? (
                <p className="arcade-label text-[11px] text-slate-500">
                  Paint some cells to begin.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {Object.entries(validation.colorCounts).map(([color, count]) => {
                    const ok = count % 4 === 0;
                    return (
                      <li key={color} className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded-full border border-white/50"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-mono text-xs">{color}</span>
                        <span className={cn('arcade-label ml-auto text-[10px]', ok ? 'text-emerald-600' : 'text-red-600')}>
                          {count} {ok ? 'ok' : `(need +${4 - (count % 4)})`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <Button
              onClick={onPublish}
              disabled={!canPublish || isPending}
              className="arcade-label w-full gap-2 text-xs"
              size="lg"
            >
              <Save className="h-4 w-4" />
              {isPending
                ? (isEdit ? 'Updating...' : 'Publishing...')
                : (isEdit ? 'Update level' : 'Publish level')}
            </Button>
            {!canPublish && (
              <p className="arcade-label text-center text-[10px] text-slate-500">
                {trimmedTitle.length === 0
                  ? `Add a title to ${isEdit ? 'update' : 'publish'}.`
                  : !youtubeValid
                    ? `Fix the YouTube URL to ${isEdit ? 'update' : 'publish'}.`
                    : `Fix validation errors to enable ${isEdit ? 'updating' : 'publishing'}.`}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <p className="arcade-label text-[11px] text-slate-500">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[2ch] text-center text-base font-bold text-slate-900">{value}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
