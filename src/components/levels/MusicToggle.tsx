import { Music2, VolumeX } from 'lucide-react';
import { ArcadePill, arcadePillIconSize } from '@/components/ArcadePill';

type Props = {
  unmuted: boolean;
  onChange: (next: boolean) => void;
  className?: string;
};

/**
 * Inline toggle for the level player's background music. Lives in the
 * LevelPlayer header (not over the game board) so it doesn't obscure play.
 *
 * Pure presentational — state is owned by the parent so a sibling
 * `<YouTubeBackground>` and this toggle stay in sync within the same render
 * tree without extra plumbing.
 */
export function MusicToggle({ unmuted, onChange, className }: Props) {
  return (
    <ArcadePill
      tone={unmuted ? 'emerald' : 'slate'}
      size="sm"
      onClick={() => onChange(!unmuted)}
      aria-pressed={unmuted}
      aria-label={unmuted ? 'Mute background music' : 'Play background music'}
      className={className}
      style={{ animationDelay: '0.3s' }}
    >
      {unmuted ? (
        <Music2 className={arcadePillIconSize('sm')} />
      ) : (
        <VolumeX className={arcadePillIconSize('sm')} />
      )}
      {unmuted ? 'Music on' : 'Music off'}
    </ArcadePill>
  );
}
