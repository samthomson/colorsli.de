/**
 * Encrypted save-game schema (NIP-78 kind 30078, encrypted to self via NIP-44).
 *
 * Stores the addressable coordinates (`kind:pubkey:d`) of every level the
 * player has cleared at least once. Coordinates (not event ids) are used
 * because levels are addressable/editable — a coordinate stays stable
 * across edits, so an unlock survives the level being republished.
 *
 * The kind-1 completion events remain the source of truth for any
 * leaderboard / personal-best display; this file is purely the player's
 * private "have I cleared X" record, used to drive sequential unlocking.
 */
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';

export type SaveGame = {
  /** Set of cleared level coordinates (`kind:pubkey:d`). Order is irrelevant. */
  completed: string[];
};

export const EMPTY_SAVE_GAME: SaveGame = { completed: [] };

/** Parse a decrypted save-game JSON string. Returns the empty save on any
 * malformed input. */
export function parseSaveGame(plaintext: string | undefined | null): SaveGame {
  if (!plaintext) return { ...EMPTY_SAVE_GAME };
  try {
    const parsed: unknown = JSON.parse(plaintext);
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY_SAVE_GAME };
    const obj = parsed as Partial<SaveGame>;
    if (!Array.isArray(obj.completed)) return { ...EMPTY_SAVE_GAME };
    const completed = obj.completed.filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );
    return { completed };
  } catch {
    return { ...EMPTY_SAVE_GAME };
  }
}

/** Serialize for encryption. Stable shape, no timestamps. */
export function serializeSaveGame(save: SaveGame): string {
  return JSON.stringify({ completed: save.completed });
}

/** Insert a coordinate (de-duped). Returns the same instance if no change. */
export function withCompletion(save: SaveGame, levelCoordinate: string): SaveGame {
  if (save.completed.includes(levelCoordinate)) return save;
  return { completed: [...save.completed, levelCoordinate] };
}

/**
 * Tags for the kind-30078 save-game event. The content (which is encrypted)
 * is built separately via `serializeSaveGame` + the user's NIP-44 signer.
 */
export function saveGameTags(): string[][] {
  return [
    ['d', TAGS.SAVE_GAME_D],
    ['t', TAGS.APP],
    ['alt', `Color Slide saved progress (encrypted, ${GAME_URL})`],
  ];
}

export const SAVE_GAME_KIND = KINDS.SAVE_GAME;
