/**
 * Single source of truth for app-wide magic values: Nostr kinds, tag names,
 * the canonical game URL, and the relay configuration.
 *
 * Relay strategy:
 * - Dev (`vite dev`): connect ONLY to a single private relay we control so the
 *   game stays under wraps while iterating.
 * - Prod (`vite build` -> deployed): public relay set.
 *
 * To switch dev/prod relays, edit `RELAYS` below; nothing else needs to change.
 */

export const KINDS = {
  /** Immutable level definition published by any user. */
  LEVEL: 7283,
  /** Replaceable list of level event ids that make up the official progression. */
  OFFICIAL_LIST: 30888,
  /** Standard text note used as a public completion / leaderboard entry. */
  COMPLETION: 1,
  /** NIP-78 application-specific data: per-user encrypted save game. */
  SAVE_GAME: 30078,
} as const;

export const TAGS = {
  /** Top-level filter tag attached to every Color Slide event. */
  APP: 'colorslide',
  /** Identifies a kind 7283 event as a published level. */
  LEVEL: 'colorslide-level',
  /** Identifies a kind 1 event as a level completion. */
  COMPLETION: 'colorslide-completion',
  /** d-tag value for the official progression list. */
  OFFICIAL_LIST_D: 'official-levels',
  /** d-tag value for the per-user save game (kind 30078). */
  SAVE_GAME_D: 'colorslide-progress',
} as const;

export const GAME_URL = 'https://colorsli.de';

/**
 * Read vs write relays.
 *
 * In dev we publish ONLY to a private relay (so unfinished levels / scores
 * don't pollute the public network) but we still READ from the public set —
 * otherwise we can't see the logged-in user's profile metadata, follow lists,
 * etc. that live on their normal relays.
 *
 * In prod, both sets are the public set.
 */
export const RELAYS = {
  DEV: {
    write: ['wss://dev-relay.colorsli.de'],
    read: [
      'wss://dev-relay.colorsli.de',
      'wss://relay.primal.net',
      'wss://relay.damus.io',
      'wss://relay.nostr.band',
    ],
  },
  PROD: {
    write: ['wss://relay.ditto.pub', 'wss://relay.primal.net', 'wss://relay.damus.io'],
    read: ['wss://relay.ditto.pub', 'wss://relay.primal.net', 'wss://relay.damus.io'],
  },
} as const;

export const ACTIVE_RELAYS = import.meta.env.DEV ? RELAYS.DEV : RELAYS.PROD;

/** Build the AppConfig relay list by unioning read + write sets with flags. */
export function buildActiveRelayList(): { url: string; read: boolean; write: boolean }[] {
  const writeSet = new Set<string>(ACTIVE_RELAYS.write);
  const readSet = new Set<string>(ACTIVE_RELAYS.read);
  const all = new Set<string>([...writeSet, ...readSet]);
  return Array.from(all).map((url) => ({
    url,
    read: readSet.has(url),
    write: writeSet.has(url),
  }));
}
