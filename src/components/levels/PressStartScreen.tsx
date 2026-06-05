import { Play } from 'lucide-react';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';

/**
 * Clean "press start" gate shown before a musical board launches. It renders
 * nothing but a big START button centered on the bubble background — matching
 * the home screen — instead of overlaying a hazy panel on the game card. The
 * click is the user gesture that grants audio autoplay (the parent mounts the
 * music iframe once started).
 */
export function PressStartScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-[45vh] items-center justify-center py-10">
      <ArcadePill tone="rainbow" size="xl" onClick={onStart}>
        <ArcadePillIcon tone="rainbow" size="xl">
          <Play className={`${arcadePillIconSize('xl')} translate-x-0.5 fill-current`} />
        </ArcadePillIcon>
        Start
      </ArcadePill>
    </div>
  );
}
