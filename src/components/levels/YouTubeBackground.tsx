import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { buildYouTubeEmbedUrl, extractYouTubeId } from '@/lib/youtube';
import { cn } from '@/lib/utils';

type Props = {
  /** Raw URL from the level event. We re-validate / extract the id ourselves. */
  url: string | undefined;
  /** Music preference (controlled by parent so a sibling toggle stays in sync). */
  unmuted: boolean;
  /** Notify parent when the user makes a choice on the splash. */
  onUnmutedChange: (next: boolean) => void;
};

/**
 * Plays a YouTube video's audio in the background while a level is active.
 *
 * ## Autoplay strategy
 *
 * Browsers refuse to autoplay audio without a recent user gesture, so we
 * always show a generic "PRESS START" interstitial whenever a level with
 * music is opened. Clicking PRESS START is the gesture that grants the page
 * autoplay-with-sound permission, and we then mount the iframe.
 *
 * The splash deliberately makes no mention of music — it reads as a generic
 * arcade interstitial so the audio side-effect feels natural rather than
 * an explicit consent prompt. Users who don't want music can mute via the
 * music toggle in the level header at any time.
 *
 * The splash positions itself absolutely *inside* the player container, so
 * the parent must be `position: relative`. It uses the same rounded shape
 * and a near-opaque pale backdrop so it visually fits the rounded panel
 * underneath rather than clipping at the panel's curved corners.
 */
export function YouTubeBackground({ url, unmuted, onUnmutedChange }: Props) {
  const videoId = extractYouTubeId(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [started, setStarted] = useState(false);

  // Whenever the user toggles the music preference *after* the iframe is
  // mounted, push the matching command down to YouTube via postMessage.
  useEffect(() => {
    if (!videoId || !started) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const command = unmuted ? 'unMute' : 'mute';
    const send = () =>
      win.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        'https://www.youtube.com',
      );
    send();
    const t = window.setTimeout(send, 600);
    return () => window.clearTimeout(t);
  }, [unmuted, videoId, started]);

  if (!videoId) return null;

  // Iframe URL bakes in the desired mute state so the very first frame
  // already matches the user's choice (no flicker between muted / unmuted).
  const src = buildYouTubeEmbedUrl(videoId, { muted: !unmuted });

  const handlePressStart = () => {
    // Press Start always satisfies autoplay-with-sound. The user's persisted
    // music preference (`unmuted`) decides whether the iframe actually plays
    // sound — if they previously muted, mounting respects that.
    setStarted(true);
  };

  return (
    <>
      {started && (
        <div
          aria-hidden
          className="pointer-events-none fixed -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0"
        >
          <iframe
            ref={iframeRef}
            src={src}
            title="Background music"
            width={1}
            height={1}
            allow="autoplay; encrypted-media"
          />
        </div>
      )}

      {!started && <PressStartSplash onPressStart={handlePressStart} />}
    </>
  );
}

/**
 * Generic "press start" interstitial — gated user gesture for audio autoplay.
 *
 * Renders absolutely inside the player container, matching the panel's
 * rounded shape with a pale, near-opaque backdrop so corners sit cleanly
 * over the underlying rounded panel.
 */
function PressStartSplash({ onPressStart }: { onPressStart: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Press Start"
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center rounded-2xl p-6 backdrop-blur-sm',
        'bg-gradient-to-br from-white/95 via-white/92 to-cyan-50/92',
        'shadow-[inset_0_0_60px_rgba(56,189,248,0.18)]',
      )}
    >
      <ArcadePill tone="cyan" size="xl" onClick={onPressStart}>
        <ArcadePillIcon tone="cyan" size="xl">
          <Play className={`${arcadePillIconSize('xl')} translate-x-0.5 fill-current`} />
        </ArcadePillIcon>
        Start
      </ArcadePill>
    </div>
  );
}
