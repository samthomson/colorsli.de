/**
 * Tile types: a "tile" is the thing that lives in a board cell. Each
 * non-null cell on the `(string | null)[][]` board is a `TileId`, and a
 * per-level `tiles` palette maps each id to a `TileKind` (sprite +
 * optional behavior). All rendering and matching is driven by that
 * palette so levels stay self-contained on Nostr.
 *
 * Default color tiles use the hex string itself as the id (e.g. id =
 * `"#ef4444"`), so a board entry resolves to its palette entry trivially.
 * Non-color tile ids (image, emoji, logic) use a type-prefix
 * (`"img:<sha>"`, `"emoji:<glyph>"`, `"hidden:<group>:<uuid>"`) so they
 * can never collide with a hex color.
 */
import type { Board } from '@/lib/colorSlide';

/** How a tile renders on screen. */
export type SpriteRef =
  | { type: 'color'; value: string }
  | { type: 'image'; url: string; sha256?: string; alt?: string }
  | { type: 'emoji'; value: string }
  /**
   * A "color changer" — cycles through `values` (hex colors) at
   * `periodMs` per color. All instances of the same tile stay in phase
   * (the current color is derived from `Date.now()`), so every cell
   * renders the same color at any given frame.
   */
  | { type: 'changer'; values: string[]; periodMs: number };

/** Optional gameplay role for a tile. */
export type TileBehavior =
  | { type: 'normal' }
  | { type: 'treasure'; group: string }
  | { type: 'hidden'; group: string };

export type TileId = string;

export type TileKind = {
  id: TileId;
  sprite: SpriteRef;
  behavior?: TileBehavior;
  /** Optional accessible/short name (e.g. "Red", "Compass", "Treasure A"). */
  label?: string;
};

export type TilePalette = Record<TileId, TileKind>;

/** Self-contained level data: the board cells + everything needed to render
 * and gameplay-interpret them. */
export type Level = {
  board: Board;
  tiles: TilePalette;
};

/** Stable id for a default color tile = the hex itself. Lets legacy boards
 * (cells are raw hex strings) remain valid as v2 tile-id boards. */
export function defaultColorTile(hex: string): TileKind {
  return { id: hex, sprite: { type: 'color', value: hex } };
}

/**
 * Build a `TileKind` for an uploaded image. Uses a content-addressed id
 * (`img:<sha256>`) when available so re-uploading the same file from a
 * different device collapses to the same brush slot; falls back to a
 * random id when the upload didn't return a sha.
 */
export function imageTile(args: {
  url: string;
  sha256?: string;
  alt?: string;
  label?: string;
}): TileKind {
  const id = args.sha256 ? `img:${args.sha256}` : `img:${cryptoRandomId()}`;
  const sprite: Extract<SpriteRef, { type: 'image' }> = {
    type: 'image',
    url: args.url,
  };
  if (args.sha256) sprite.sha256 = args.sha256;
  if (args.alt) sprite.alt = args.alt;
  const tile: TileKind = { id, sprite };
  if (args.label) tile.label = args.label;
  return tile;
}

/** Minimum color-changer period (ms) — below this the animation is
 * jarring and the timer overhead per tile gets silly. */
export const MIN_CHANGER_PERIOD_MS = 250;
/** Default color-changer period used by the editor dialog when the user
 * doesn't touch the slider. Picked to feel "noticeable but not frantic". */
export const DEFAULT_CHANGER_PERIOD_MS = 1500;

/**
 * Build a `TileKind` for a "color changer" tile (cycles through several
 * colors). The id is derived from the canonical
 * `<periodMs>:<v1>-<v2>-...` form so two changer tiles with the same
 * colors-in-the-same-order and period dedupe in the palette / library.
 */
export function colorChangerTile(args: {
  values: string[];
  periodMs?: number;
  label?: string;
}): TileKind {
  const values = args.values.map((v) => v.trim()).filter(Boolean);
  if (values.length < 2) {
    throw new Error('A color changer needs at least 2 colors.');
  }
  const periodMs = Math.max(MIN_CHANGER_PERIOD_MS, args.periodMs ?? DEFAULT_CHANGER_PERIOD_MS);
  const id = `changer:${periodMs}:${values.join('-')}`;
  const tile: TileKind = {
    id,
    sprite: { type: 'changer', values, periodMs },
  };
  if (args.label) tile.label = args.label;
  return tile;
}

/**
 * Build a `TileKind` for an emoji glyph. The id is content-derived
 * (`emoji:<glyph>`) so adding the same emoji twice collapses to one
 * palette entry — and matches the d-tag used by the corresponding kind
 * 37284 tile event, keeping the user's library de-duped.
 */
export function emojiTile(args: { value: string; label?: string }): TileKind {
  const value = args.value;
  const tile: TileKind = {
    id: `emoji:${value}`,
    sprite: { type: 'emoji', value },
  };
  if (args.label) tile.label = args.label;
  return tile;
}

/**
 * Static fallback CSS background color for a tile (no live clock).
 * Color sprites paint their hex; changer sprites paint their first
 * color as a static preview; image / emoji sprites use `transparent`
 * so an overlay (see `TileSprite`) can sit on a neutral surface.
 *
 * Treasure color tiles also return `transparent` — the chest-icon overlay
 * from `TileSprite` takes on the tile's hex via `currentColor`, so the
 * cell silhouette becomes the chest shape rather than a flat disc.
 *
 * For live color-changing tiles, call `useColorChanger(tile)` in the
 * cell renderer and prefer its return value when non-null.
 */
export function tileBackgroundColor(tile: TileKind | null | undefined): string {
  if (!tile) return 'transparent';
  if (tile.sprite.type === 'color') {
    if (tile.behavior?.type === 'treasure') return 'transparent';
    return tile.sprite.value;
  }
  if (tile.sprite.type === 'changer') {
    return tile.sprite.values[0] ?? 'transparent';
  }
  return 'transparent';
}

/**
 * Pure helper: the color a color-changer tile shows at a given
 * timestamp (ms). All instances share the same phase because the
 * index derives from the absolute clock, not a per-instance start time.
 */
export function colorChangerColorAt(
  sprite: Extract<SpriteRef, { type: 'changer' }>,
  nowMs: number,
): string {
  const { values, periodMs } = sprite;
  if (values.length === 0) return 'transparent';
  if (periodMs <= 0) return values[0];
  const idx = Math.floor(nowMs / periodMs) % values.length;
  return values[idx] ?? values[0];
}

/** Cheap-ish random id used as a fallback when a Blossom upload doesn't
 * return a content hash. Safe to import client-side because `crypto`
 * exists in jsdom and modern browsers. */
function cryptoRandomId(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Synthesize a default-color tile palette covering every unique non-null
 * cell of a board whose cells are hex strings. Used by random/practice
 * boards (the runtime board generator emits hex cells directly) and as a
 * defensive fallback when a parsed level event arrives without a palette. */
export function colorTilesFromBoard(board: Board): TilePalette {
  const tiles: TilePalette = {};
  for (const row of board) {
    for (const cell of row) {
      if (cell === null) continue;
      if (!tiles[cell]) tiles[cell] = defaultColorTile(cell);
    }
  }
  return tiles;
}

/** Look up a tile id, defensively falling back to a synthesized color
 * tile if the palette is missing the id (e.g. malformed level event). */
export function lookupTile(tiles: TilePalette, id: TileId): TileKind {
  return tiles[id] ?? defaultColorTile(id);
}

/**
 * Project a board to a "match key" board the existing match engine can
 * consume unchanged. Identity for normal/treasure tiles. Hidden tiles
 * whose group is NOT in `revealed` get a per-cell unique sentinel so they
 * occupy a cell (still slidable) but can never form runs with anything
 * (visible-but-unmatchable). Once their group is revealed they fall back
 * to their original id and match normally.
 */
export function matchKeyBoard(
  board: Board,
  tiles: TilePalette,
  revealed: ReadonlySet<string> = new Set(),
): Board {
  return board.map((row, r) =>
    row.map((cell, c) => {
      if (cell === null) return null;
      const behavior = tiles[cell]?.behavior;
      if (behavior?.type === 'hidden' && !revealed.has(behavior.group)) {
        return `__hidden__:${r}:${c}`;
      }
      return cell;
    }),
  );
}

/** True iff the tile is currently matchable: visible AND not a hidden
 * tile whose group is still locked. Caller decides what to do with
 * unmatchable tiles (typically render a placeholder). */
export function isTileMatchable(
  tile: TileKind | undefined,
  revealed: ReadonlySet<string>,
): boolean {
  if (!tile) return true;
  const b = tile.behavior;
  if (!b || b.type === 'normal') return true;
  if (b.type === 'treasure') return true;
  return revealed.has(b.group);
}
