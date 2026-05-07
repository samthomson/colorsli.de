/**
 * Encode/decode helpers for kind 7283 Color Slide level events.
 *
 * The level board is stored as JSON in `content`; descriptive metadata
 * (title, dims, app/level filter tags) lives in `tags` so relays can index it.
 */
import type { NostrEvent } from '@nostrify/nostrify';
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';
import type { Board } from '@/lib/colorSlide';

export type LevelEventTemplate = {
  kind: typeof KINDS.LEVEL;
  content: string;
  tags: string[][];
  created_at?: number;
};

export type ParsedLevel = {
  /** Underlying Nostr event id (also the immutable level id). */
  id: string;
  /** Author hex pubkey. */
  pubkey: string;
  /** Display title. */
  title: string;
  /** Initial board layout (color hex per cell, or null for empty). */
  board: Board;
  /** Number of rows in the board. */
  rows: number;
  /** Number of cols in the board. */
  cols: number;
  /** Optional YouTube URL to play as background music while playing. */
  youtubeUrl?: string;
  /** Original event for reference / re-publishing. */
  event: NostrEvent;
};

/** Build the event template that `useNostrPublish` will sign and publish. */
export function buildLevelTemplate(args: {
  title: string;
  board: Board;
  youtubeUrl?: string;
}): LevelEventTemplate {
  const { title, board, youtubeUrl } = args;
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error('Level title is required.');
  }

  const tags: string[][] = [
    ['t', TAGS.APP],
    ['t', TAGS.LEVEL],
    ['title', trimmedTitle],
    ['rows', String(rows)],
    ['cols', String(cols)],
    ['alt', `Color Slide level: ${trimmedTitle} (play at ${GAME_URL})`],
  ];

  const trimmedYt = youtubeUrl?.trim();
  if (trimmedYt) {
    tags.push(['youtube', trimmedYt]);
  }

  return {
    kind: KINDS.LEVEL,
    content: JSON.stringify({ board }),
    tags,
  };
}

/** Parse a kind 7283 event into a ParsedLevel; returns null if malformed. */
export function parseLevelEvent(event: NostrEvent): ParsedLevel | null {
  if (event.kind !== KINDS.LEVEL) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const board = (parsed as { board?: unknown }).board;
  if (!Array.isArray(board)) return null;
  // Light shape check: 2D array of strings or null.
  for (const row of board) {
    if (!Array.isArray(row)) return null;
    for (const cell of row) {
      if (cell !== null && typeof cell !== 'string') return null;
    }
  }

  const title = event.tags.find(([n]) => n === 'title')?.[1]?.trim() || 'Untitled level';
  const rows = Number(event.tags.find(([n]) => n === 'rows')?.[1]) || board.length;
  const cols = Number(event.tags.find(([n]) => n === 'cols')?.[1]) || (board[0]?.length ?? 0);
  const youtubeUrl = event.tags.find(([n]) => n === 'youtube')?.[1]?.trim() || undefined;

  return {
    id: event.id,
    pubkey: event.pubkey,
    title,
    board: board as Board,
    rows,
    cols,
    youtubeUrl,
    event,
  };
}
