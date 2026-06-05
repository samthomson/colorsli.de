import { useCompletedLevels } from '@/hooks/useCompletedLevels';
import { useOfficialLevels } from '@/hooks/useOfficialLevels';
import { useUserLevels } from '@/hooks/useUserLevels';

/**
 * Renders nothing — it just mounts the level-list queries at app root so
 * TanStack Query starts fetching them immediately (from the start screen).
 * By the time the user navigates to Play or Discover the data is already
 * cached, so those pages render instantly instead of showing a skeleton.
 *
 * Query keys match the ones the pages use, so this is a true cache warm-up:
 *   - useOfficialLevels()  → Play progression + Discover's exclude set
 *   - useUserLevels(100)   → Discover community feed
 *   - useCompletedLevels() → Play unlock state (no-op when logged out)
 */
export function LevelPrefetch() {
  useOfficialLevels();
  useUserLevels(100);
  useCompletedLevels();
  return null;
}
