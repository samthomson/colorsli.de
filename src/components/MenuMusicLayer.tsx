import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { BrandLogo } from '@/components/BrandLogo';
import { CirclesBackground } from '@/components/CirclesBackground';
import { useLocalStorage, useSessionStorage } from '@/hooks/useLocalStorage';
import { MENU_MUSIC_URL } from '@/lib/constants';
import { buildYouTubeEmbedUrl, extractYouTubeId } from '@/lib/youtube';

/**
 * App-wide menu music layer.
 *
 * - Lives once at router root (so unlock state is shared across pages).
 * - Shows a "Press Start" overlay on non-play routes until the user clicks.
 * - Plays hidden-loop YouTube audio on non-play routes only.
 * - Reuses the same `colorslide:music-unmuted` preference as level music.
 */
export function MenuMusicLayer() {
  const [started, setStarted] = useSessionStorage<boolean>('colorslide:audio-unlocked', false);
  const [levelMusicActive, setLevelMusicActive] = useSessionStorage<boolean>('colorslide:level-music-active', false);
  const [unmuted, setUnmuted] = useLocalStorage<boolean>('colorslide:music-unmuted', true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Show splash on every hard refresh / new load.
  useEffect(() => {
    setStarted(false);
    setLevelMusicActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shouldRenderOverlay = !started;
  const shouldRenderMusic = started && !levelMusicActive;

  const videoId = extractYouTubeId(MENU_MUSIC_URL);
  const src = videoId
    ? buildYouTubeEmbedUrl(videoId, { muted: !unmuted })
    : null;

  useEffect(() => {
    if (!shouldRenderMusic || !videoId) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const muteCommand = unmuted ? 'unMute' : 'mute';
    const send = (func: string) =>
      win.postMessage(
        JSON.stringify({ event: 'command', func, args: [] }),
        'https://www.youtube.com',
      );
    // Retry a few times because YouTube player API readiness is racy.
    send(muteCommand);
    send('playVideo');
    const t1 = window.setTimeout(() => {
      send(muteCommand);
      send('playVideo');
    }, 450);
    const t2 = window.setTimeout(() => {
      send(muteCommand);
      send('playVideo');
    }, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [unmuted, shouldRenderMusic, videoId]);

  return (
    <>
      {shouldRenderMusic && src && (
        <div
          aria-hidden
          className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
        >
          <iframe
            ref={iframeRef}
            src={src}
            title="Menu background music"
            width={1}
            height={1}
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      {shouldRenderOverlay && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#fff5e6] text-[#2a1050]">
          {/* Own bubble background so this reads as the home screen rather than
              a hazy wash over whatever route is mounted behind it. */}
          <CirclesBackground />
          <div className="relative z-10 flex min-h-full flex-col items-center justify-center gap-8 px-6 py-10">
            <div className="w-fit max-w-full px-2 py-1 text-center sm:px-4">
              <BrandLogo variant="hero" />
            </div>
            <ArcadePill
              tone="rainbow"
              size="2xl"
              onClick={() => {
                setUnmuted(true);
                setStarted(true);
              }}
            >
              <ArcadePillIcon tone="rainbow" size="2xl">
                <Play className={`${arcadePillIconSize('2xl')} translate-x-1 fill-current`} />
              </ArcadePillIcon>
              Start
            </ArcadePill>
          </div>
        </div>
      )}
    </>
  );
}
