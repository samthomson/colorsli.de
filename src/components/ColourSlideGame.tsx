import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Trophy, Settings2, Timer, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type Board,
  checkBlocked,
  checkMatches,
  createRandomBoard,
  isGameComplete,
} from '@/lib/colorSlide';
import {
  colorTilesFromBoard,
  lookupTile,
  matchKeyBoard,
  type TileKind,
  type TilePalette,
} from '@/lib/tile';
import { TileSprite } from '@/components/TileSprite';
import { BubbleBoardGL } from '@/components/BubbleBoardGL';
import { useColorChanger } from '@/hooks/useColorChanger';
import { computeScore, formatTime } from '@/lib/scoring';
import { playBurst, playSlide, playComplete, setSfxEnabled } from '@/lib/sfx';
import { useLocalStorage } from '@/hooks/useLocalStorage';

/**
 * LLM maintenance notes:
 * - Core invariants live in `src/lib/colorSlide.ts`. This component is just
 *   the React drag/drop UI.
 * - Cells store tile ids; the per-level `tiles` palette resolves each id
 *   to a `TileKind` (sprite + optional behavior). Color tiles use the hex
 *   string itself as the id so legacy hex-board callers (practice mode,
 *   v1 levels) Just Work.
 * - Match resolution is deferred until drag release (never during drag
 *   movement). The engine runs against a projected match-key board via
 *   `matchKeyBoard` so future hidden tiles (stage 3) can be visible-but-
 *   unmatchable without touching match algorithms.
 * - When `initialBoard` is provided, the random size selector + new game button
 *   are hidden and the timer + onComplete callback fire on first move / game end.
 */

export type CompletionResult = {
  moves: number;
  seconds: number;
  score: number;
};

export type ColourSlideGameProps = {
  /** Pre-built board to play. If omitted, the component is in random/practice mode. */
  initialBoard?: Board;
  /**
   * Tile palette covering every id used in `initialBoard`. Required for
   * level mode; in practice mode the component synthesizes a palette of
   * default color tiles from whatever cells the random generator emits.
   */
  initialTiles?: TilePalette;
  /** Optional title shown in the card header (e.g. the level name). */
  levelLabel?: string;
  /** Called once when the player clears the board. */
  onComplete?: (result: CompletionResult) => void;
  /**
   * When false, the controls row (size selector, moves, timer, Start Over)
   * is rendered with `visibility: hidden` so layout is preserved but nothing
   * shows through the Press-Start splash. Defaults to `true` so callers that
   * don't gate on a splash continue to work unchanged.
   */
  started?: boolean;
  /** Optional controls rendered in the card footer (e.g. back/share/fork). */
  footer?: ReactNode;
};

export function ColourSlideGame({
  initialBoard,
  initialTiles,
  levelLabel,
  onComplete,
  started = true,
  footer,
}: ColourSlideGameProps = {}) {
  const isLevelMode = initialBoard !== undefined;

  const [gridSize, setGridSize] = useState(initialBoard?.length ?? 10);
  const [board, setBoard] = useState<Board>(
    () => initialBoard?.map(row => [...row]) ?? createRandomBoard(10),
  );

  // Real board dimensions. Levels can be non-square (rows !== cols), so all
  // index/geometry math must use these rather than the single `gridSize`
  // (which only drives the practice-mode square selector). Slides preserve
  // dimensions, so these are stable for the lifetime of a board.
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  // Tile palette: stick with whatever was provided in level mode; for
  // practice mode we synthesize default color tiles from the random
  // board's cell hex strings (color tile id === hex, so this is identity).
  const tiles = useMemo<TilePalette>(() => {
    if (initialTiles) return initialTiles;
    if (initialBoard) return colorTilesFromBoard(initialBoard);
    return colorTilesFromBoard(board);
  }, [initialTiles, initialBoard, board]);

  // Reveal state for hidden-tile behaviors. Grows when a treasure tile
  // group is cleared (see `triggerMatchCheck`); never shrinks within a
  // single playthrough.
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set<string>());
  const [dragging, setDragging] = useState<{
    type: 'row' | 'col' | 'undecided';
    index: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [matching, setMatching] = useState<{ row: number; col: number }[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const completionFiredRef = useRef(false);

  const [soundOn, setSoundOn] = useLocalStorage<boolean>('colorslide:sfx', true);

  useEffect(() => {
    setSfxEnabled(soundOn);
  }, [soundOn]);

  // Play a burst sound on the rising edge of a match resolving (matching
  // goes empty -> non-empty). Intensity scales with how many tiles cleared.
  const prevMatchCountRef = useRef(0);
  useEffect(() => {
    if (matching.length > 0 && prevMatchCountRef.current === 0) {
      playBurst(Math.min(1, matching.length / 4));
    }
    prevMatchCountRef.current = matching.length;
  }, [matching]);

  // Celebratory fanfare on the rising edge of completion.
  useEffect(() => {
    if (isComplete) playComplete();
  }, [isComplete]);

  // Note: when the parent navigates between levels it should remount this
  // component (e.g. with `key={level.id}`) rather than mutate `initialBoard`.
  // That keeps the timer/score state correctly scoped per level and avoids
  // setState-in-effect.

  const resetGame = useCallback((size: number) => {
    setBoard(createRandomBoard(size));
    setGridSize(size);
    setMatching([]);
    setIsComplete(false);
    setMoveCount(0);
    setStartedAt(null);
    setRevealed(new Set<string>());
    completionFiredRef.current = false;
  }, []);

  // Projected match-key board (identity in stage 1, hidden-tile-aware in
  // stage 3). All match / block / completion checks consume this rather
  // than the raw board so the engine stays oblivious to tile behaviors.
  const projectedBoard = useMemo(
    () => matchKeyBoard(board, tiles, revealed),
    [board, tiles, revealed],
  );

  // Derived: blocked cells always reflect the current board with no setState.
  const blocked = useMemo(() => checkBlocked(projectedBoard), [projectedBoard]);

  // Tick the elapsed-time clock once a second while a run is active.
  // (Also ticks for practice mode so the post-completion modal can show
  // a real time/score, not zeros.)
  useEffect(() => {
    if (startedAt === null || isComplete) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, isComplete]);

  // Hard rule: matching/clearing is triggered only from drag release. We call
  // this synchronously from `handleMouseUp` to avoid setState-in-effect.
  const triggerMatchCheck = useCallback(() => {
    setBoard((currentBoard) => {
      const projected = matchKeyBoard(currentBoard, tiles, revealed);
      const matches = checkMatches(projected);
      if (matches.length === 0) return currentBoard;

      setMatching(matches);

      // Side effect: if any treasure tiles cleared, unlock their groups
      // so the corresponding hidden tiles become matchable + render their
      // real sprite. Fire synchronously with the match animation so the
      // reveal feels coupled to the player's slide rather than to the
      // delayed null step below.
      const groupsToReveal = new Set<string>();
      for (const { row, col } of matches) {
        const cellId = currentBoard[row][col];
        if (!cellId) continue;
        const behavior = tiles[cellId]?.behavior;
        if (behavior?.type === 'treasure') groupsToReveal.add(behavior.group);
      }
      if (groupsToReveal.size > 0) {
        setRevealed((prev) => {
          const next = new Set(prev);
          for (const g of groupsToReveal) next.add(g);
          return next;
        });
      }

      setTimeout(() => {
        setBoard((prev) => {
          const next = prev.map((row) => [...row]);
          matches.forEach(({ row, col }) => { next[row][col] = null; });
          return next;
        });
        setMatching([]);

        setTimeout(() => {
          setBoard((cur) => {
            if (isGameComplete(cur)) setIsComplete(true);
            return cur;
          });
        }, 100);
      }, 600);

      // Keep board unchanged here; the timeout above does the actual clearing.
      return currentBoard;
    });
  }, [tiles, revealed]);

  // Fire onComplete exactly once when the board clears. Practice + level
  // modes both notify their parent — the only difference is the modal the
  // parent decides to show. We compute final seconds here without any
  // setState so this effect only side-effects on the parent.
  useEffect(() => {
    if (!isComplete || completionFiredRef.current) return;
    if (!onComplete) return;
    const elapsedMs = startedAt !== null ? Date.now() - startedAt : 0;
    const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const score = computeScore({ moves: moveCount, seconds });
    completionFiredRef.current = true;
    onComplete({ moves: moveCount, seconds, score });
  }, [isComplete, onComplete, moveCount, startedAt]);

  const elapsedSeconds = useMemo(() => {
    if (startedAt === null) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1000));
  }, [now, startedAt]);

  const handleMouseDown = (rowIndex: number, colIndex: number, clientX: number, clientY: number) => {
    setDragging({
      type: 'undecided',
      index: rowIndex * cols + colIndex,
      startX: clientX,
      startY: clientY,
      offsetX: 0,
      offsetY: 0,
    });
  };

  const handleMouseMove = (clientX: number, clientY: number) => {
    if (!dragging) return;

    const offsetX = clientX - dragging.startX;
    const offsetY = clientY - dragging.startY;
    let newDragging = { ...dragging, offsetX, offsetY };

    if (dragging.type === 'undecided') {
      const absX = Math.abs(offsetX);
      const absY = Math.abs(offsetY);
      if (absX > 5 || absY > 5) {
        if (absX > absY) {
          const rowIndex = Math.floor(dragging.index / cols);
          newDragging = { ...newDragging, type: 'row', index: rowIndex };
        } else {
          const colIndex = dragging.index % cols;
          newDragging = { ...newDragging, type: 'col', index: colIndex };
        }
        // Axis just locked in — a soft tick so grabbing a row/col is audible
        // even before it steps a full cell.
        playSlide();
      }
    }

    setDragging(newDragging);
    if (newDragging.type === 'undecided') return;

    const gridElement = document.querySelector('[data-grid]');
    if (!gridElement) return;
    const rect = gridElement.getBoundingClientRect();
    const cellSize = newDragging.type === 'row' ? rect.width / cols : rect.height / rows;
    const threshold = cellSize * 0.7;
    const offset = newDragging.type === 'row' ? offsetX : offsetY;

    if (Math.abs(offset) > threshold) {
      const direction = offset > 0 ? 1 : -1;

      setBoard(prevBoard => {
        const newBoard = prevBoard.map(row => [...row]);
        if (newDragging.type === 'row') {
          const row = newBoard[newDragging.index];
          if (direction > 0) {
            const last = row.pop()!;
            row.unshift(last);
          } else {
            const first = row.shift()!;
            row.push(first);
          }
        } else {
          const col = newDragging.index;
          const column = newBoard.map(row => row[col]);
          if (direction > 0) {
            const last = column.pop()!;
            column.unshift(last);
          } else {
            const first = column.shift()!;
            column.push(first);
          }
          column.forEach((val, i) => { newBoard[i][col] = val; });
        }
        return newBoard;
      });

      setMoveCount(prev => prev + 1);
      playSlide();
      // Start the timer on the very first move (both modes).
      if (startedAt === null) {
        const t = Date.now();
        setStartedAt(t);
        setNow(t);
      }
      setDragging({ ...newDragging, startX: clientX, startY: clientY, offsetX: 0, offsetY: 0 });
    }
  };

  const handleMouseUp = () => {
    if (dragging && dragging.type !== 'undecided') {
      triggerMatchCheck();
    }
    setDragging(null);
  };

  return (
    <Card className="w-full max-w-4xl border-white/70 bg-gradient-to-br from-white via-cyan-50/70 to-indigo-50/70 shadow-2xl">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="brand-arcade-title bg-clip-text text-transparent text-3xl leading-none sm:text-4xl">
            {levelLabel ?? 'Color Slide'}
          </CardTitle>
          {isComplete && (
            <div className="flex items-center gap-2 text-emerald-600">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="font-semibold">Complete!</span>
            </div>
          )}
        </div>

        <div
          className={cn(
            'flex items-center gap-4 flex-wrap',
            !started && 'invisible',
          )}
        >
          {!isLevelMode && (
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <Select value={gridSize.toString()} onValueChange={(val) => resetGame(parseInt(val))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n}x{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="arcade-label text-xs text-muted-foreground">
            Moves: <span className="text-foreground">{moveCount}</span>
          </div>

          <div className="arcade-label flex items-center gap-1.5 text-xs text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span className="tabular-nums text-foreground">{formatTime(elapsedSeconds)}</span>
          </div>

          <button
            type="button"
            onClick={() => setSoundOn((v) => !v)}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
            className={cn(
              'rounded-full border p-1.5 transition-colors',
              soundOn
                ? 'border-cyan-600 bg-cyan-500 text-white'
                : 'border-slate-300 bg-white/70 text-slate-500 hover:border-cyan-400',
            )}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {!isLevelMode && (
            <ArcadePill
              tone="slate"
              size="sm"
              onClick={() => resetGame(gridSize)}
              className="ml-auto"
            >
              <ArcadePillIcon tone="slate" size="sm">
                <RotateCcw className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              Start Over
            </ArcadePill>
          )}
        </div>

        {blocked.length > 0 ? (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-3 rounded-md border border-red-200 dark:border-red-800">
            <span className="font-bold text-lg">!</span>
            <p>
              <strong>5+ in a row detected!</strong> Break them apart - you need exactly 4 to match.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Slide rows and columns to match 4 tiles in a row. Click and drag to slide!
          </p>
        )}
      </CardHeader>

      <CardContent>
        {/* Soft tinted glass "play tray" — light and airy so the board feels
            calm, with just enough tint + inset to make the neon 3D bubbles
            read. Padding lives here (outer) so the WebGL canvas, which spans
            the inner relative box, stays pixel-aligned with the grid. */}
        <div
          className="mx-auto overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-100/70 via-sky-100/60 to-violet-100/70 p-3 shadow-[inset_0_1px_14px_rgba(79,70,229,0.14)] ring-1 ring-white/70 sm:p-4"
          style={{ maxWidth: `${Math.min(600, cols * 50) + 32}px` }}
        >
          <div
            className="relative"
            onMouseMove={(e) => handleMouseMove(e.clientX, e.clientY)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={(e) => {
              if (dragging) {
                const touch = e.touches[0];
                handleMouseMove(touch.clientX, touch.clientY);
              }
            }}
            onTouchEnd={handleMouseUp}
          >
            <BubbleBoardGL
              board={board}
              tiles={tiles}
              revealed={revealed}
              dragging={dragging}
              matching={matching}
            />
            <div
              data-grid
              className="grid gap-1 select-none"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
            {board.map((row, rowIndex) => (
              row.map((cellId, colIndex) => {
                const isBlocked = blocked.some(b => b.row === rowIndex && b.col === colIndex);
                const isDraggingRow = dragging?.type === 'row' && dragging?.index === rowIndex;
                const isDraggingCol = dragging?.type === 'col' && dragging?.index === colIndex;
                const isDraggingThis = isDraggingRow || isDraggingCol;

                let transform = '';
                if (dragging && isDraggingThis) {
                  if (isDraggingRow) transform = `translateX(${dragging.offsetX}px)`;
                  else if (isDraggingCol) transform = `translateY(${dragging.offsetY}px)`;
                }

                const tile = cellId ? lookupTile(tiles, cellId) : null;
                const isHidden =
                  tile?.behavior?.type === 'hidden' &&
                  !revealed.has(tile.behavior.group);

                return (
                  <GameCell
                    key={`${rowIndex}-${colIndex}`}
                    tile={tile}
                    cellId={cellId}
                    isHidden={isHidden}
                    isBlocked={isBlocked}
                    isDraggingRow={isDraggingRow}
                    isDraggingCol={isDraggingCol}
                    isDraggingThis={isDraggingThis}
                    transform={transform}
                    onMouseDown={(e) => {
                      if (cellId) {
                        e.preventDefault();
                        handleMouseDown(rowIndex, colIndex, e.clientX, e.clientY);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (cellId) {
                        const touch = e.touches[0];
                        handleMouseDown(rowIndex, colIndex, touch.clientX, touch.clientY);
                      }
                    }}
                  />
                );
              })
            ))}
            </div>
          </div>
        </div>
      </CardContent>
      {footer ? <CardFooter className="pt-2">{footer}</CardFooter> : null}
    </Card>
  );
}

type GameCellProps = {
  tile: TileKind | null;
  cellId: string | null;
  isHidden: boolean;
  isBlocked: boolean;
  isDraggingRow: boolean;
  isDraggingCol: boolean;
  isDraggingThis: boolean;
  transform: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
};

/**
 * A single board cell. Extracted into its own component so it can call
 * `useColorChanger` (which has to run per render, can't live inside a
 * `.map()`).
 *
 * The cell is the interaction + layout surface only. Plain color / color-
 * changer tiles render transparent here — the `BubbleBoardGL` WebGL canvas
 * paints them as 3D spheres on top. Non-color sprites (image, emoji,
 * treasure chest, hidden "?") always render in the DOM so the canvas only
 * owns the bubbles.
 */
function GameCell({
  tile,
  cellId,
  isHidden,
  isBlocked,
  isDraggingRow,
  isDraggingCol,
  isDraggingThis,
  transform,
  onMouseDown,
  onTouchStart,
}: GameCellProps) {
  // Subscribe to changer ticks so the WebGL canvas re-reads the live color at
  // each boundary (the canvas resolves the actual hue itself per frame).
  useColorChanger(tile);

  const isColorish =
    !isHidden &&
    tile != null &&
    ((tile.sprite.type === 'color' && tile.behavior?.type !== 'treasure') ||
      tile.sprite.type === 'changer');

  return (
    <div
      className={cn(
        'aspect-square rounded-full relative',
        cellId ? 'cursor-move' : 'border-2 border-dashed border-indigo-300/50',
        isBlocked && 'ring-2 ring-red-500 ring-offset-1 animate-pulse',
        isDraggingThis ? 'transition-none' : 'transition-all duration-200',
        isDraggingRow && !isBlocked && 'ring-2 ring-cyan-500 scale-105',
        isDraggingCol && !isBlocked && 'ring-2 ring-blue-500 scale-105',
        isHidden && 'bg-slate-700 dark:bg-slate-800 overflow-hidden',
        !isColorish && !isHidden && 'overflow-hidden',
      )}
      style={{ transform }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {isHidden ? (
        <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-slate-300">
          ?
        </span>
      ) : isColorish ? null : (
        <TileSprite tile={tile} />
      )}
      {isBlocked && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-xs font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">!</div>
        </div>
      )}
    </div>
  );
}
