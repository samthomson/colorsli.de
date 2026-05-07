import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw, Trophy, Settings2, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type Board,
  checkBlocked,
  checkMatches,
  createRandomBoard,
  isGameComplete,
} from '@/lib/colorSlide';
import { computeScore, formatTime } from '@/lib/scoring';

/**
 * LLM maintenance notes:
 * - Core invariants live in `src/lib/colorSlide.ts`. This component is just
 *   the React drag/drop UI.
 * - Match resolution is deferred until drag release (never during drag movement).
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
  /** Optional title shown in the card header (e.g. the level name). */
  levelLabel?: string;
  /** Called once when the player clears the board. */
  onComplete?: (result: CompletionResult) => void;
};

export function ColourSlideGame({ initialBoard, levelLabel, onComplete }: ColourSlideGameProps = {}) {
  const isLevelMode = initialBoard !== undefined;

  const [gridSize, setGridSize] = useState(initialBoard?.length ?? 10);
  const [board, setBoard] = useState<Board>(
    () => initialBoard?.map(row => [...row]) ?? createRandomBoard(10),
  );
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
    completionFiredRef.current = false;
  }, []);

  // Derived: blocked cells always reflect the current board with no setState.
  const blocked = useMemo(() => checkBlocked(board), [board]);

  // Tick the elapsed-time clock once a second while in level mode and active.
  useEffect(() => {
    if (!isLevelMode || startedAt === null || isComplete) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isLevelMode, startedAt, isComplete]);

  // Hard rule: matching/clearing is triggered only from drag release. We call
  // this synchronously from `handleMouseUp` to avoid setState-in-effect.
  const triggerMatchCheck = useCallback(() => {
    setBoard((currentBoard) => {
      const matches = checkMatches(currentBoard);
      if (matches.length === 0) return currentBoard;

      setMatching(matches);

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
  }, []);

  // Fire onComplete exactly once when the level clears. We compute the final
  // seconds here without any setState so this effect only side-effects on the
  // parent — display continues to derive from `now` (which the timer effect
  // freezes by clearing its interval once isComplete is true).
  useEffect(() => {
    if (!isComplete || completionFiredRef.current) return;
    if (!isLevelMode || !onComplete) return;
    const elapsedMs = startedAt !== null ? Date.now() - startedAt : 0;
    const seconds = Math.max(0, Math.floor(elapsedMs / 1000));
    const score = computeScore({ moves: moveCount, seconds });
    completionFiredRef.current = true;
    onComplete({ moves: moveCount, seconds, score });
  }, [isComplete, isLevelMode, onComplete, moveCount, startedAt]);

  const elapsedSeconds = useMemo(() => {
    if (startedAt === null) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1000));
  }, [now, startedAt]);

  const handleMouseDown = (rowIndex: number, colIndex: number, clientX: number, clientY: number) => {
    setDragging({
      type: 'undecided',
      index: rowIndex * gridSize + colIndex,
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
          const rowIndex = Math.floor(dragging.index / gridSize);
          newDragging = { ...newDragging, type: 'row', index: rowIndex };
        } else {
          const colIndex = dragging.index % gridSize;
          newDragging = { ...newDragging, type: 'col', index: colIndex };
        }
      }
    }

    setDragging(newDragging);
    if (newDragging.type === 'undecided') return;

    const gridElement = document.querySelector('[data-grid]');
    if (!gridElement) return;
    const rect = gridElement.getBoundingClientRect();
    const cellSize = newDragging.type === 'row' ? rect.width / gridSize : rect.height / gridSize;
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
      // Start the level timer on the very first move.
      if (isLevelMode && startedAt === null) {
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
    <Card className="w-full max-w-4xl shadow-2xl">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-cyan-500 bg-clip-text text-transparent sm:text-3xl">
            {levelLabel ?? 'Color Slide'}
          </CardTitle>
          {isComplete && (
            <div className="flex items-center gap-2 text-emerald-600">
              <Trophy className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="font-semibold">Complete!</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
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

          <div className="text-sm text-muted-foreground">
            Moves: <span className="font-semibold text-foreground">{moveCount}</span>
          </div>

          {isLevelMode && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span className="font-semibold text-foreground">{formatTime(elapsedSeconds)}</span>
            </div>
          )}

          {!isLevelMode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resetGame(gridSize)}
              className="ml-auto"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              New Game
            </Button>
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
            Slide rows and columns to match 4 colors in a row. Click and drag to slide!
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div
          className="relative mx-auto"
          style={{ maxWidth: `${Math.min(600, gridSize * 50)}px` }}
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
          <div
            data-grid
            className="grid gap-1 select-none"
            style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` }}
          >
            {board.map((row, rowIndex) => (
              row.map((color, colIndex) => {
                const isMatching = matching.some(m => m.row === rowIndex && m.col === colIndex);
                const isBlocked = blocked.some(b => b.row === rowIndex && b.col === colIndex);
                const isDraggingRow = dragging?.type === 'row' && dragging?.index === rowIndex;
                const isDraggingCol = dragging?.type === 'col' && dragging?.index === colIndex;
                const isDraggingThis = isDraggingRow || isDraggingCol;

                let transform = '';
                if (dragging && isDraggingThis) {
                  if (isDraggingRow) transform = `translateX(${dragging.offsetX}px)`;
                  else if (isDraggingCol) transform = `translateY(${dragging.offsetY}px)`;
                }

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={cn(
                      'aspect-square rounded-full relative',
                      color ? 'cursor-move' : 'border-2 border-dashed border-gray-300 dark:border-gray-600',
                      isMatching && 'scale-125 animate-pulse shadow-lg',
                      isBlocked && 'ring-2 ring-red-500 ring-offset-1 animate-pulse',
                      isDraggingThis ? 'transition-none' : 'transition-all duration-200',
                      isDraggingRow && !isBlocked && 'ring-2 ring-cyan-500 shadow-xl scale-105',
                      isDraggingCol && !isBlocked && 'ring-2 ring-blue-500 shadow-xl scale-105',
                    )}
                    style={{ backgroundColor: color || 'transparent', transform }}
                    onMouseDown={(e) => {
                      if (color) {
                        e.preventDefault();
                        handleMouseDown(rowIndex, colIndex, e.clientX, e.clientY);
                      }
                    }}
                    onTouchStart={(e) => {
                      if (color) {
                        const touch = e.touches[0];
                        handleMouseDown(rowIndex, colIndex, touch.clientX, touch.clientY);
                      }
                    }}
                  >
                    {isBlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-xs font-bold drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">!</div>
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
