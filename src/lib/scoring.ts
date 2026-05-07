/**
 * Score formula for level completions.
 *
 * Higher score = fewer moves and faster time. Easy to tune — only this file
 * needs to change. Floor of zero so we never publish negative scores.
 */
export function computeScore(args: { moves: number; seconds: number }): number {
  const { moves, seconds } = args;
  return Math.max(0, 10000 - moves * 50 - seconds * 5);
}

/** mm:ss formatter, used in completion summaries and leaderboards. */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
