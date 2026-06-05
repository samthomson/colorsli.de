/**
 * Encode/decode helpers for Color Slide level events (kind 37283,
 * **addressable**).
 *
 * Each level has a stable random `d` tag chosen at first publish. The
 * `(kind, pubkey, d)` triple — exposed as `ParsedLevel.coordinate` — is the
 * only stable identifier across edits. Republishing with the same d-tag
 * replaces the prior version on the relay.
 *
 * ## Content schema
 *
 * The board layout and tile palette are stored as JSON in `content`;
 * metadata (title, dims, filter tags) lives in `tags` so relays can index
 * it.
 *
 *   {
 *     "board": [["tileId", null, ...], ...],
 *     "tiles": { "tileId": { "id": "...", "sprite": {...}, "behavior": {...} } }
 *   }
 *
 * Color tiles use their hex string as the id (e.g. `"#ef4444"`), so a
 * board entry resolves directly to its palette entry.
 */
import type { NostrEvent } from '@nostrify/nostrify';
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';
import type { Board } from '@/lib/colorSlide';
import { buildLevelCoordinate, newLevelDTag } from '@/lib/coordinate';
import {
  colorTilesFromBoard,
  type TileKind,
  type TilePalette,
} from '@/lib/tile';

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
  /** Initial board layout: each non-null cell is a `TileId` in `tiles`. */
  board: Board;
  /**
   * Tile palette describing every id used in `board`. Legacy v1 events
   * synthesize one default color tile per unique hex cell on parse.
   */
  tiles: TilePalette;
  /** Number of rows in the board. */
  rows: number;
  /** Number of cols in the board. */
  cols: number;
  /** Optional YouTube URL to play as background music while playing. */
  youtubeUrl?: string;
  /**
   * If this level was forked from another, the source revision's event id
   * (from the `e` fork tag). Undefined for original levels.
   */
  forkOf?: { eventId: string };
  /** Original event for reference / re-publishing. */
  event: NostrEvent;
};

/**
 * Build the event template that `useNostrPublish` will sign and publish.
 *
 * `tiles` is required: a palette covering every non-null cell id in
 * `board`. The level editor synthesizes this from its active brush set
 * and any image/special tiles the user has added.
 *
 * Pass `existingDTag` to reuse a prior level's d-tag — that turns the
 * publish into a replacement (edit) of the previous revision. Omit it to
 * create a brand-new level (a fresh random d-tag is generated).
 *
 * Pass `forkOf` when this level is forked from another: it records the
 * exact source revision via an `e` tag (marked `fork`), reply-style.
 */
export function buildLevelTemplate(args: {
  title: string;
  board: Board;
  tiles: TilePalette;
  youtubeUrl?: string;
  existingDTag?: string;
  forkOf?: { eventId: string };
}): LevelEventTemplate {
  const { title, board, tiles, youtubeUrl, existingDTag, forkOf } = args;
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error('Level title is required.');
  }

  const dTag = existingDTag ?? newLevelDTag();

  // Sanity: prune palette entries not actually referenced on the board so
  // we don't leak abandoned tiles into the published event.
  const used = new Set<string>();
  for (const row of board) {
    for (const cell of row) {
      if (cell !== null) used.add(cell);
    }
  }
  const trimmedTiles: TilePalette = {};
  for (const id of used) {
    const tile = tiles[id];
    if (tile) trimmedTiles[id] = tile;
  }

  const hasLogic = Object.values(trimmedTiles).some(
    (t) => t.behavior && t.behavior.type !== 'normal',
  );

  const tags: string[][] = [
    ['d', dTag],
    ['t', TAGS.APP],
    ['t', TAGS.LEVEL],
    ['title', trimmedTitle],
    ['rows', String(rows)],
    ['cols', String(cols)],
    ['alt', `Color Slide level: ${trimmedTitle} (play at ${GAME_URL})`],
  ];

  if (hasLogic) tags.push(['t', TAGS.LOGIC]);

  // Fork attribution: reference the exact source revision, reply-style.
  if (forkOf) {
    tags.push(['e', forkOf.eventId, '', 'fork']);
  }

  const trimmedYt = youtubeUrl?.trim();
  if (trimmedYt) {
    tags.push(['youtube', trimmedYt]);
  }

  return {
    kind: KINDS.LEVEL,
    content: JSON.stringify({ board, tiles: trimmedTiles }),
    tags,
  };
}

/**
 * Parse a kind 37283 event into a ParsedLevel; returns null if malformed
 * or missing the required `d` tag.
 */
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

  const rawBoard = (parsed as { board?: unknown }).board;
  if (!Array.isArray(rawBoard)) return null;
  for (const row of rawBoard) {
    if (!Array.isArray(row)) return null;
    for (const cell of row) {
      if (cell !== null && typeof cell !== 'string') return null;
    }
  }
  const board = rawBoard as Board;

  const rawTiles = (parsed as { tiles?: unknown }).tiles;
  const tiles: TilePalette =
    rawTiles && typeof rawTiles === 'object' && !Array.isArray(rawTiles)
      ? sanitizeTilePalette(rawTiles as Record<string, unknown>)
      : colorTilesFromBoard(board);

  // Defensive: ensure every cell id has a palette entry. Hostile/malformed
  // events that reference a missing id get a synthesized color fallback
  // (`lookupTile` does the same at render time, but baking it into the
  // parsed level keeps downstream code from worrying about it).
  for (const row of board) {
    for (const cell of row) {
      if (cell === null) continue;
      if (!tiles[cell]) tiles[cell] = { id: cell, sprite: { type: 'color', value: cell } };
    }
  }

  const title = event.tags.find(([n]) => n === 'title')?.[1]?.trim() || 'Untitled level';
  const rows = Number(event.tags.find(([n]) => n === 'rows')?.[1]) || board.length;
  const cols = Number(event.tags.find(([n]) => n === 'cols')?.[1]) || (board[0]?.length ?? 0);
  const youtubeUrl = event.tags.find(([n]) => n === 'youtube')?.[1]?.trim() || undefined;

  // Fork provenance: the `e` tag marked `fork` points at the source revision.
  const forkEventId = event.tags.find(([n, , , marker]) => n === 'e' && marker === 'fork')?.[1];
  const forkOf = forkEventId ? { eventId: forkEventId } : undefined;

  return {
    id: event.id,
    coordinate: buildLevelCoordinate(event.pubkey, dTag),
    dTag,
    pubkey: event.pubkey,
    title,
    board,
    tiles,
    rows,
    cols,
    youtubeUrl,
    forkOf,
    event,
  };
}

/**
 * Defensively normalize a `tiles` object from an untrusted event. Anything
 * malformed is dropped silently — the downstream cell-id-to-tile lookup
 * synthesizes a color-tile fallback so a partial palette never crashes
 * the renderer.
 */
function sanitizeTilePalette(raw: Record<string, unknown>): TilePalette {
  const out: TilePalette = {};
  for (const [id, value] of Object.entries(raw)) {
    if (typeof id !== 'string' || !value || typeof value !== 'object') continue;
    const v = value as Record<string, unknown>;
    const sprite = sanitizeSprite(v.sprite);
    if (!sprite) continue;
    const behavior = sanitizeBehavior(v.behavior);
    const label = typeof v.label === 'string' ? v.label : undefined;
    const tile: TileKind = { id, sprite };
    if (behavior) tile.behavior = behavior;
    if (label) tile.label = label;
    out[id] = tile;
  }
  return out;
}

function sanitizeSprite(value: unknown): TileKind['sprite'] | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case 'color':
      return typeof v.value === 'string' ? { type: 'color', value: v.value } : null;
    case 'image': {
      if (typeof v.url !== 'string') return null;
      const sprite: Extract<TileKind['sprite'], { type: 'image' }> = { type: 'image', url: v.url };
      if (typeof v.sha256 === 'string') sprite.sha256 = v.sha256;
      if (typeof v.alt === 'string') sprite.alt = v.alt;
      return sprite;
    }
    case 'emoji':
      return typeof v.value === 'string' ? { type: 'emoji', value: v.value } : null;
    case 'changer': {
      if (!Array.isArray(v.values)) return null;
      const values = v.values.filter((x): x is string => typeof x === 'string' && x.length > 0);
      if (values.length < 2) return null;
      const periodMs = typeof v.periodMs === 'number' && v.periodMs > 0 ? v.periodMs : 1500;
      return { type: 'changer', values, periodMs };
    }
    default:
      return null;
  }
}

function sanitizeBehavior(value: unknown): TileKind['behavior'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case 'normal':
      return { type: 'normal' };
    case 'treasure':
      return typeof v.group === 'string' ? { type: 'treasure', group: v.group } : undefined;
    case 'hidden':
      return typeof v.group === 'string' ? { type: 'hidden', group: v.group } : undefined;
    default:
      return undefined;
  }
}
