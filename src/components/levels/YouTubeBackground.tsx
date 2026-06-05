import { useEffect, useRef } from 'react';
import { buildYouTubeEmbedUrl, extractYouTubeId } from '@/lib/youtube';

type Props = {
  /** Raw URL from the level event. We re-validate / extract the id ourselves. */
  url: string | undefined;
  /** Music preference (controlled by parent so a sibling toggle stays in sync). */
  unmuted: boolean;
  /**
   * Whether the player has hit Start (and thus granted audio autoplay). The
   * iframe only mounts once true. The Start gesture itself is owned by the
   * page (see `PressStartScreen`), so this component is purely the audio
   * iframe now.
   */
  started: boolean;
};

/**
 * Plays a YouTube video's audio in the background while a level is active.
 *
 * Browsers refuse to autoplay audio without a recent user gesture; the page
 * shows a `PressStartScreen` to capture that gesture and flip `started`, at
 * which point this mounts a hidden iframe that plays (or stays muted per the
 * user's preference).
 */
export function YouTubeBackground({ url, unmuted, started }: Props) {
  const videoId = extractYouTubeId(url);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  if (!videoId || !started) return null;

  // Iframe URL bakes in the desired mute state so the very first frame
  // already matches the user's choice (no flicker between muted / unmuted).
  const src = buildYouTubeEmbedUrl(videoId, { muted: !unmuted });

  return (
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
  );
}
