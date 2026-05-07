/**
 * Pure board logic for Color Slide.
 *
 * Rules:
 * - A board is a 2D array of color hex strings or `null` (empty cell).
 * - A "match" is exactly 4 same-colored cells in a row or column. Runs of 5+
 *   are blocked (never clear) and shown to the player as warnings.
 * - A *starting* board is "valid" iff every non-null color count is divisible
 *   by 4 AND there are no runs of 4 or more in any row/column. Pre-existing
 *   4-runs would auto-clear on the player's first move; pre-existing 5+ runs
 *   are permanently blocked. Neither belongs in a starting position — the
 *   maximum allowed run length on a starting board is 3.
 */

export type Color = string | null;
export type Board = Color[][];
export type Cell = { row: number; col: number };

/** Default playable color palette for the editor and random generator. */
export const COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#0ea5e9', // sky
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#f97316', // orange
] as const;

/** True if the board contains any horizontal/vertical run of 4+ same color. */
export function hasAnyFourInARow(board: Board): boolean {
  const rows = board.length;
  if (rows === 0) return false;
  const cols = board[0].length;

  for (let row = 0; row < rows; row++) {
    let cur: Color = null;
    let count = 0;
    for (let col = 0; col <= cols; col++) {
      const color = col < cols ? board[row][col] : null;
      if (color === cur && color !== null) {
        count++;
        if (count >= 4) return true;
      } else {
        cur = color;
        count = 1;
      }
    }
  }

  for (let col = 0; col < cols; col++) {
    let cur: Color = null;
    let count = 0;
    for (let row = 0; row <= rows; row++) {
      const color = row < rows ? board[row][col] : null;
      if (color === cur && color !== null) {
        count++;
        if (count >= 4) return true;
      } else {
        cur = color;
        count = 1;
      }
    }
  }

  return false;
}

/**
 * Cells that are part of a same-color run of `minRun` or more cells
 * (horizontal or vertical). De-duplication: a single run is reported as
 * `count` separate cells, but runs in different orientations crossing the
 * same cell will produce duplicates — callers that care can dedupe.
 */
export function checkRunsAtLeast(board: Board, minRun: number): Cell[] {
  const result: Cell[] = [];
  const rows = board.length;
  if (rows === 0) return result;
  const cols = board[0].length;

  for (let row = 0; row < rows; row++) {
    let cur: Color = null;
    let count = 0;
    let startCol = 0;
    for (let col = 0; col <= cols; col++) {
      const color = col < cols ? board[row][col] : null;
      if (color === cur && color !== null) {
        count++;
      } else {
        if (count >= minRun && cur !== null) {
          for (let i = startCol; i < startCol + count; i++) result.push({ row, col: i });
        }
        cur = color;
        count = 1;
        startCol = col;
      }
    }
  }

  for (let col = 0; col < cols; col++) {
    let cur: Color = null;
    let count = 0;
    let startRow = 0;
    for (let row = 0; row <= rows; row++) {
      const color = row < rows ? board[row][col] : null;
      if (color === cur && color !== null) {
        count++;
      } else {
        if (count >= minRun && cur !== null) {
          for (let i = startRow; i < startRow + count; i++) result.push({ row: i, col });
        }
        cur = color;
        count = 1;
        startRow = row;
      }
    }
  }

  return result;
}

/**
 * Cells that are part of a 5+ in-a-row run. This is the *runtime* warning
 * surfaced during play (those cells can never clear because clears require
 * exact 4-runs). For starting-board / publishability checks, use
 * `validateLevel` which is stricter (no 4-runs either).
 */
export function checkBlocked(board: Board): Cell[] {
  return checkRunsAtLeast(board, 5);
}

/** Cells in exact 4-runs (horizontal or vertical). De-duplicated across overlaps. */
export function checkMatches(board: Board): Cell[] {
  const matches: Cell[] = [];
  const rows = board.length;
  if (rows === 0) return matches;
  const cols = board[0].length;
  const cleared = new Set<string>();

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col <= cols - 4; col++) {
      const color = board[row][col];
      if (!color) continue;
      const isFour =
        board[row][col + 1] === color &&
        board[row][col + 2] === color &&
        board[row][col + 3] === color &&
        (col === 0 || board[row][col - 1] !== color) &&
        (col + 4 >= cols || board[row][col + 4] !== color);
      if (!isFour) continue;
      const keys = [`${row},${col}`, `${row},${col + 1}`, `${row},${col + 2}`, `${row},${col + 3}`];
      if (keys.some(k => cleared.has(k))) continue;
      keys.forEach(k => cleared.add(k));
      matches.push(
        { row, col },
        { row, col: col + 1 },
        { row, col: col + 2 },
        { row, col: col + 3 },
      );
    }
  }

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row <= rows - 4; row++) {
      const color = board[row][col];
      if (!color) continue;
      const isFour =
        board[row + 1][col] === color &&
        board[row + 2][col] === color &&
        board[row + 3][col] === color &&
        (row === 0 || board[row - 1][col] !== color) &&
        (row + 4 >= rows || board[row + 4][col] !== color);
      if (!isFour) continue;
      const keys = [`${row},${col}`, `${row + 1},${col}`, `${row + 2},${col}`, `${row + 3},${col}`];
      if (keys.some(k => cleared.has(k))) continue;
      keys.forEach(k => cleared.add(k));
      matches.push(
        { row, col },
        { row: row + 1, col },
        { row: row + 2, col },
        { row: row + 3, col },
      );
    }
  }

  return matches;
}

/** Board contains no colored cells (all null). Used to detect level completion. */
export function isGameComplete(board: Board): boolean {
  return board.every(row => row.every(cell => cell === null));
}

export type LevelValidation = {
  /**
   * Cells that are part of a run of 4 or more — the maximum allowed run on a
   * starting board is 3 (a 4-run would auto-clear on first slide; a 5+ run
   * would be permanently blocked). Level cannot be published while non-empty.
   */
  blockedCells: Cell[];
  /** Per-color cell counts, only for non-null cells. */
  colorCounts: Record<string, number>;
  /** Colors whose count is not a positive multiple of 4. */
  invalidColors: string[];
  /** True iff publishable: at least one colored cell, no blocked, all counts %4==0. */
  isValid: boolean;
};

export function validateLevel(board: Board): LevelValidation {
  // Stricter than the runtime `checkBlocked` (which only flags 5+): for
  // starting-board validation, any run of 4 or more is an issue.
  const blockedCells = checkRunsAtLeast(board, 4);
  const colorCounts: Record<string, number> = {};
  let totalColored = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell) {
        colorCounts[cell] = (colorCounts[cell] ?? 0) + 1;
        totalColored++;
      }
    }
  }

  const invalidColors = Object.entries(colorCounts)
    .filter(([, count]) => count % 4 !== 0)
    .map(([color]) => color);

  const isValid =
    totalColored > 0 && blockedCells.length === 0 && invalidColors.length === 0;

  return { blockedCells, colorCounts, invalidColors, isValid };
}

/** Build an empty board of given dimensions (all null cells). */
export function emptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => null as Color));
}

/**
 * Random board generator used by the legacy /practice random mode and as a
 * fallback. Produces a board with no initial 4+ runs and color counts in
 * multiples of 4 across the chosen palette.
 */
export function createRandomBoard(size: number, palette: readonly string[] = COLORS): Board {
  const totalCells = size * size;
  const groupsOfFour = Math.floor(totalCells / 4);
  const leftoverCells = totalCells % 4;

  const numColors =
    groupsOfFour <= 4 ? Math.min(2, palette.length) :
    groupsOfFour <= 9 ? Math.min(3, palette.length) :
    groupsOfFour <= 16 ? Math.min(4, palette.length) :
    groupsOfFour <= 25 ? Math.min(5, palette.length) :
    Math.min(6, palette.length);

  const groupsPerColor = Math.floor(groupsOfFour / numColors);
  const remainder = groupsOfFour % numColors;

  const masterColors: Color[] = [];
  for (let i = 0; i < numColors; i++) {
    const color = palette[i];
    const groups = groupsPerColor + (i < remainder ? 1 : 0);
    for (let j = 0; j < groups; j++) {
      masterColors.push(color, color, color, color);
    }
  }
  for (let i = 0; i < leftoverCells; i++) masterColors.push(null);

  const maxAttempts = 100;
  let board: Board = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const colors = [...masterColors];
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    board = [];
    let idx = 0;
    for (let row = 0; row < size; row++) {
      const r: Color[] = [];
      for (let col = 0; col < size; col++) r.push(colors[idx++]);
      board.push(r);
    }
    if (!hasAnyFourInARow(board) && checkBlocked(board).length === 0) return board;
  }
  return board;
}
