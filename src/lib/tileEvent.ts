/**
 * Encode / decode helpers for Color Slide *tile* events (kind 37284,
 * addressable).
 *
 * Each tile event is one uploaded image sprite owned by a user. The
 * level editor publishes one whenever the user adds a new image tile,
 * so the same image can be picked from the user's library on future
 * levels. Levels still embed a full snapshot of their tile palette in
 * the level event's content, so play doesn't require resolving extra
 * events — tile events are purely a "library" facet.
 *
 * Color and emoji tiles never get library entries: color = the hex IS
 * the id (infinite, free), emoji = universal Unicode (no per-user data
 * worth persisting; a built-in picker is enough).
 *
 * d-tag = the in-palette tile id (`img:<sha256>`). Re-uploading the
 * same image refreshes the same event.
 *
 * Content: JSON containing the full `TileKind` minus the `behavior`
 * field (behavior is level-scoped — `treasure` / `hidden` only make
 * sense in the context of a specific level's groupings).
 */
import type { NostrEvent } from '@nostrify/nostrify';
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';
import type { SpriteRef, TileKind } from '@/lib/tile';

export type TileEventTemplate = {
  kind: typeof KINDS.TILE;
  content: string;
  tags: string[][];
  created_at?: number;
};

export type ParsedTile = {
  id: string;
  /** Underlying Nostr event id of this revision. */
  eventId: string;
  /** Author hex pubkey. */
  pubkey: string;
  /** d-tag, identical to `tile.id`. */
  dTag: string;
  /** The actual tile (sprite + optional label) ready to drop into a level palette. */
  tile: TileKind;
  /** Original event for reference / republishing. */
  event: NostrEvent;
};

/**
 * Build an unsigned template for the tile event. The d-tag is the
 * `tile.id`, so two calls with the same tile id produce replacements of
 * each other (intended — re-saving the same image overwrites previous
 * label / alt edits without leaving an orphan).
 */
export function buildTileTemplate(tile: TileKind): TileEventTemplate {
  const sprite = tile.sprite;
  if (sprite.type !== 'image') {
    throw new Error('Only image tiles get library entries — color is the hex itself; emoji is universal Unicode.');
  }

  const labelTag: string[][] = tile.label ? [['title', tile.label]] : [];
  const altSummary = humanSummary(sprite);

  const tags: string[][] = [
    ['d', tile.id],
    ['t', TAGS.APP],
    ['t', TAGS.TILE],
    ...labelTag,
    ['alt', `Color Slide tile: ${altSummary} (${GAME_URL})`],
  ];

  // Image tiles also carry their URL / hash as top-level tags so a relay
  // operator (or a generic browser) can see what's stored without
  // parsing content.
  tags.push(['image', sprite.url]);
  if (sprite.sha256) tags.push(['x', sprite.sha256]);
  if (sprite.alt) tags.push(['alt-text', sprite.alt]);

  // Strip behavior — level-scoped, not library-scoped.
  const { behavior: _behavior, ...rest } = tile;
  void _behavior;
  const content = JSON.stringify(rest);

  return {
    kind: KINDS.TILE,
    content,
    tags,
  };
}

/**
 * Parse a kind-37284 event into a `ParsedTile`. Returns null when the
 * event is malformed, missing required fields, or carries a sprite type
 * we don't render (defense against future schema extensions).
 */
export function parseTileEvent(event: NostrEvent): ParsedTile | null {
  if (event.kind !== KINDS.TILE) return null;
  const dTag = event.tags.find(([n]) => n === 'd')?.[1]?.trim();
  if (!dTag) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(event.content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const raw = parsed as Record<string, unknown>;
  const sprite = sanitizeSprite(raw.sprite);
  if (!sprite) return null;
  if (sprite.type !== 'image') return null;

  const id = typeof raw.id === 'string' && raw.id ? raw.id : dTag;
  const label = typeof raw.label === 'string' ? raw.label : undefined;
  const tile: TileKind = { id, sprite };
  if (label) tile.label = label;

  return {
    id,
    eventId: event.id,
    pubkey: event.pubkey,
    dTag,
    tile,
    event,
  };
}

function sanitizeSprite(value: unknown): SpriteRef | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case 'color':
      return typeof v.value === 'string' ? { type: 'color', value: v.value } : null;
    case 'image': {
      if (typeof v.url !== 'string') return null;
      const sprite: Extract<SpriteRef, { type: 'image' }> = { type: 'image', url: v.url };
      if (typeof v.sha256 === 'string') sprite.sha256 = v.sha256;
      if (typeof v.alt === 'string') sprite.alt = v.alt;
      return sprite;
    }
    case 'emoji':
      return typeof v.value === 'string' && v.value.length > 0
        ? { type: 'emoji', value: v.value }
        : null;
    default:
      return null;
  }
}

function humanSummary(sprite: Extract<SpriteRef, { type: 'image' }>): string {
  return sprite.alt ?? 'image';
}
