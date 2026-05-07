/**
 * YouTube URL helpers used by the level editor / background music player.
 *
 * Security: extracted video ids are validated against the strict YouTube id
 * format (11 chars, [A-Za-z0-9_-]). The embed iframe URL is then constructed
 * from that sanitized id plus our own static query string — never from raw
 * user input — so this is XSS-safe even though the source URL comes from
 * untrusted Nostr events.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Try to pull an 11-char YouTube video id out of common URL shapes. */
export function extractYouTubeId(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null;
  const url = rawUrl.trim();
  if (!url) return null;

  // Bare id
  if (YOUTUBE_ID.test(url)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1).split('/')[0];
    return YOUTUBE_ID.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
    // youtube.com/watch?v=<id>
    const v = parsed.searchParams.get('v');
    if (v && YOUTUBE_ID.test(v)) return v;

    // youtube.com/embed/<id>, /shorts/<id>, /v/<id>, /live/<id>
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const head = segments[0];
      const candidate = segments[1];
      if (
        (head === 'embed' || head === 'shorts' || head === 'v' || head === 'live') &&
        YOUTUBE_ID.test(candidate)
      ) {
        return candidate;
      }
    }
  }

  return null;
}

/** Build the embed URL for a (validated) video id.
 *
 * `muted` defaults to true because browsers refuse to autoplay-with-sound
 * without a recent user gesture; pass `muted: false` only after a user click.
 * `enablejsapi=1` lets us send mute/unMute commands later via postMessage;
 * `playsinline=1` keeps iOS Safari from going fullscreen.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  options: { muted?: boolean } = {},
): string {
  const muted = options.muted ?? true;
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: '1',
    playlist: videoId, // required for `loop=1` to actually loop a single video
    controls: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    rel: '0',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}
