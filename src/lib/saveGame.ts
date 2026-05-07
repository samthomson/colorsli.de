/**
 * Encrypted save-game schema (NIP-78 kind 30078, encrypted to self via NIP-44).
 *
 * Intentionally tiny: a flat list of cleared level event ids. The kind-1
 * completion events are still the source of truth for leaderboards / scores;
 * this file is only the player's private "which levels have I cleared" record,
 * used to drive sequential unlocking in `/practice`.
 */
import { GAME_URL, KINDS, TAGS } from '@/lib/constants';

export type SaveGame = {
  version: 1;
  /** Set of cleared level event ids (kind 7283 ids). Order does not matter. */
  completed: string[];
};

export const EMPTY_SAVE_GAME: SaveGame = { version: 1, completed: [] };

/** Parse a decrypted save-game JSON string. Returns the empty save on any error. */
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
    return { version: 1, completed };
  } catch {
    return { ...EMPTY_SAVE_GAME };
  }
}

/** Serialize for encryption. Stable shape, no timestamps. */
export function serializeSaveGame(save: SaveGame): string {
  return JSON.stringify({ version: 1, completed: save.completed });
}

/** Insert a level id (de-duped). Returns the same instance if no change. */
export function withCompletion(save: SaveGame, levelEventId: string): SaveGame {
  if (save.completed.includes(levelEventId)) return save;
  return { version: 1, completed: [...save.completed, levelEventId] };
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
