/**
 * Single source of truth for app-wide magic values: Nostr kinds, tag names,
 * the canonical game URL, and the relay / blossom configuration.
 *
 * Network strategy:
 * - Dev (`vite dev`): connect ONLY to our private dev relay (so in-progress
 *   levels / scores don't pollute the public network) but READ from the
 *   public set too so profile metadata, follow lists, etc. resolve.
 * - Prod (`vite build` -> deployed): public relay set.
 *
 * Blossom follows the same DEV/PROD split. The first URL is the upload
 * target; any extras are mirrors that `BlossomUploader` writes `server`
 * tags for so clients can fall back when fetching.
 *
 * To switch dev/prod endpoints, edit `RELAYS` or `BLOSSOM` below; the
 * `import.meta.env.DEV` flag at the bottom picks the right set
 * automatically.
 */

export const KINDS = {
  /**
   * Addressable level definition published by any user.
   *
   * Identified by the (kind, pubkey, d) coordinate — the d-tag is a stable
   * random slug picked when the level is first created. Republishing with
   * the same d-tag *replaces* the prior version (NIP-01 addressable
   * semantics), so authors can edit their own published levels.
   *
   * Other Color Slide events that "point at a level" (completions, save
   * game, official list) reference the coordinate (`37283:pubkey:d`) via
   * `a` tags / coordinate strings — never the event id — so they survive
   * level edits.
   */
  LEVEL: 37283,
  /**
   * Addressable per-tile event — a reusable sprite owned by a user. The
   * level editor publishes one of these each time the user adds a new
   * image or emoji tile, so the same sprite can be picked from the user's
   * library on future levels. Levels still embed a full snapshot of the
   * tile palette so play doesn't require resolving extra events.
   *
   * d-tag = the in-palette tile id (e.g. `img:<sha256>`, `emoji:<glyph>`).
   * Re-publishing with the same d-tag = updating that tile's metadata.
   */
  TILE: 37284,
  /** Replaceable list of `a` coordinates that make up the official progression. */
  OFFICIAL_LIST: 30888,
  /** Standard text note used as a public completion / leaderboard entry. */
  COMPLETION: 1,
  /** NIP-78 application-specific data: per-user encrypted save game. */
  SAVE_GAME: 30078,
} as const;

export const TAGS = {
  /** Top-level filter tag attached to every Color Slide event. */
  APP: 'colorslide',
  /** Identifies a kind 37283 event as a published level. */
  LEVEL: 'colorslide-level',
  /** Identifies a kind 37284 event as a reusable tile (library entry). */
  TILE: 'colorslide-tile',
  /** Marks a level that uses non-normal tile behaviors (treasure/hidden). */
  LOGIC: 'colorslide-logic',
  /** Identifies a kind 1 event as a level completion. */
  COMPLETION: 'colorslide-completion',
  /** d-tag value for the official progression list. */
  OFFICIAL_LIST_D: 'official-levels',
  /** d-tag value for the per-user save game (kind 30078). */
  SAVE_GAME_D: 'colorslide-progress',
} as const;

export const GAME_URL = 'https://colorsli.de';

/**
 * One config per environment. Each branch holds the relay sets (read +
 * write) plus the Blossom servers (first = upload target, rest = mirrors
 * recorded as `server` tags so clients can fall back when fetching).
 *
 * To change a URL: edit the right branch below. `import.meta.env.DEV`
 * picks `ENV.DEV` during `vite dev` and `ENV.PROD` during `vite build`.
 */
export const ENV = {
  DEV: {
    relays: {
      write: ['wss://dev-relay.colorsli.de'],
      read: [
        'wss://dev-relay.colorsli.de',
        'wss://relay.primal.net',
        'wss://relay.damus.io',
        'wss://relay.nostr.band',
      ],
    },
    blossom: ['https://blossom.primal.net/'],
    menuMusicUrl: 'https://www.youtube.com/watch?v=r_p3e-dRkZg',
  },
  PROD: {
    relays: {
      write: ['wss://relay.ditto.pub', 'wss://relay.primal.net', 'wss://relay.damus.io'],
      read: ['wss://relay.ditto.pub', 'wss://relay.primal.net', 'wss://relay.damus.io'],
    },
    blossom: ['https://blossom.primal.net/'],
    menuMusicUrl: 'https://www.youtube.com/watch?v=r_p3e-dRkZg',
  },
} as const;

export const ACTIVE = import.meta.env.DEV ? ENV.DEV : ENV.PROD;

/** Build the AppConfig relay list by unioning read + write sets with flags. */
export function buildActiveRelayList(): { url: string; read: boolean; write: boolean }[] {
  const writeSet = new Set<string>(ACTIVE.relays.write);
  const readSet = new Set<string>(ACTIVE.relays.read);
  const all = new Set<string>([...writeSet, ...readSet]);
  return Array.from(all).map((url) => ({
    url,
    read: readSet.has(url),
    write: writeSet.has(url),
  }));
}
