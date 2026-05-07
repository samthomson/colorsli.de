/**
 * Admin pubkeys for the Color Slide official level progression.
 *
 * Add hex pubkey(s) here to enable admin-only UI ("Add to Official", reorder,
 * remove) and to authorise reading the official progression list (kind 30888).
 *
 * IMPORTANT: hex format, not npub. If you only have an npub, convert with
 * nip19.decode(npub).data.
 */
export const ADMIN_PUBKEYS: readonly string[] = [
  '2093baa8621c5b255e8f4fc2c6fdfc10d8a5598a25517664efaba860735f1030'
];

export function isAdmin(pubkey: string | undefined): boolean {
  if (!pubkey) return false;
  return ADMIN_PUBKEYS.includes(pubkey);
}
