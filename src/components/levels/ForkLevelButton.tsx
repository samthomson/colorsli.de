import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { ArcadePill } from '@/components/ArcadePill';
import { KINDS } from '@/lib/constants';
import type { ParsedLevel } from '@/lib/levelEvent';

/** GitHub's `repo-forked` octicon (filled), matching the Fork-button glyph. */
function RepoForkedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
    </svg>
  );
}

type ForkLevelButtonProps = {
  level: ParsedLevel;
  tone?: 'cyan' | 'amber' | 'emerald' | 'red' | 'indigo' | 'rainbow' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

/**
 * Opens the level editor seeded from any level (`/create?fork=<naddr>`).
 * Works for every level — your own, someone else's, or an official one —
 * because forking always produces a new level under the current user.
 */
export function ForkLevelButton({
  level,
  tone = 'indigo',
  size = 'sm',
  className,
}: ForkLevelButtonProps) {
  const naddr = nip19.naddrEncode({
    identifier: level.dTag,
    pubkey: level.pubkey,
    kind: KINDS.LEVEL,
  });

  return (
    <ArcadePill asChild tone={tone} size={size} className={className}>
      <Link to={`/create?fork=${naddr}`}>
        <RepoForkedIcon className="h-5 w-5" />
        Fork
      </Link>
    </ArcadePill>
  );
}
