/**
 * Helpers for Nostr addressable-event coordinates ("a" tag values).
 *
 * Format: `<kind>:<hex pubkey>:<d-tag>`. Used everywhere we need to
 * identify a level across edits — the event id changes per revision, but
 * the coordinate stays stable for the lifetime of the level.
 */
import { KINDS } from '@/lib/constants';

export type LevelCoordinate = {
  kind: number;
  pubkey: string;
  dTag: string;
};

/** Build the canonical coordinate string for a level. */
export function buildLevelCoordinate(pubkey: string, dTag: string): string {
  return `${KINDS.LEVEL}:${pubkey}:${dTag}`;
}

/** Generic coordinate builder (any addressable kind). */
export function buildCoordinate(kind: number, pubkey: string, dTag: string): string {
  return `${kind}:${pubkey}:${dTag}`;
}

/**
 * Parse a coordinate string. Returns null if the input is malformed —
 * malformed coordinates from untrusted Nostr events should be silently
 * dropped rather than thrown so a single bad reference can't take a list out.
 */
export function parseCoordinate(coord: string | undefined | null): LevelCoordinate | null {
  if (!coord) return null;
  const parts = coord.split(':');
  if (parts.length < 3) return null;
  const kindStr = parts[0];
  const pubkey = parts[1];
  // Allow `:` inside the d-tag (rare but legal).
  const dTag = parts.slice(2).join(':');
  const kind = Number(kindStr);
  if (!Number.isFinite(kind) || kind < 0) return null;
  if (!/^[0-9a-f]{64}$/.test(pubkey)) return null;
  if (!dTag) return null;
  return { kind, pubkey, dTag };
}

/**
 * Generate a new random d-tag for a freshly-created level.
 *
 * 12 chars of base36 from the Web Crypto RNG = ~62 bits of entropy, well
 * past the birthday-collision threshold for any user's lifetime catalog.
 */
export function newLevelDTag(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n.toString(36).padStart(12, '0').slice(0, 12);
}
