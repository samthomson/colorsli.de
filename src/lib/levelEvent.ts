/**
 * Encode/decode helpers for Color Slide level events (kind 37283,
 * **addressable**).
 *
 * Each level has a stable random `d` tag chosen at first publish. The
 * `(kind, pubkey, d)` triple — exposed as `ParsedLevel.coordinate` — is the
 * only stable identifier across edits. Republishing with the same d-tag
 * replaces the prior version on the relay.
 *
 * The board layout is stored as JSON in `content`; metadata (title, dims,
 * filter tags) lives in `tags` so relays can index it.
 */
import type { NostrEvent } from '@nostrify/nostrify';
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';
import type { Board } from '@/lib/colorSlide';
import { buildLevelCoordinate, newLevelDTag } from '@/lib/coordinate';

export type LevelEventTemplate = {
  kind: typeof KINDS.LEVEL;
  content: string;
  tags: string[][];
  created_at?: number;
};

export type ParsedLevel = {
  /** Underlying Nostr event id of *this revision*. Changes on every edit. */
  id: string;
  /** Stable coordinate `kind:pubkey:d`. The thing to reference everywhere. */
  coordinate: string;
  /** d-tag (the editable level's permanent slug for this author). */
  dTag: string;
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

/** Build the event template that `useNostrPublish` will sign and publish.
 *
 * Pass `existingDTag` to reuse a prior level's d-tag — that turns the
 * publish into a replacement (edit) of the previous revision. Omit it to
 * create a brand-new level (a fresh random d-tag is generated).
 */
export function buildLevelTemplate(args: {
  title: string;
  board: Board;
  youtubeUrl?: string;
  existingDTag?: string;
}): LevelEventTemplate {
  const { title, board, youtubeUrl, existingDTag } = args;
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error('Level title is required.');
  }

  const dTag = existingDTag ?? newLevelDTag();

  const tags: string[][] = [
    ['d', dTag],
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

/** Parse a kind 37283 event into a ParsedLevel; returns null if malformed
 * or missing the required `d` tag (which is non-negotiable for addressable
 * events). */
export function parseLevelEvent(event: NostrEvent): ParsedLevel | null {
  if (event.kind !== KINDS.LEVEL) return null;

  const dTag = event.tags.find(([n]) => n === 'd')?.[1]?.trim();
  if (!dTag) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const board = (parsed as { board?: unknown }).board;
  if (!Array.isArray(board)) return null;
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
    coordinate: buildLevelCoordinate(event.pubkey, dTag),
    dTag,
    pubkey: event.pubkey,
    title,
    board: board as Board,
    rows,
    cols,
    youtubeUrl,
    event,
  };
}
