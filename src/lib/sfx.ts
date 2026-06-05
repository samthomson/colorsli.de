/**
 * Tiny Web Audio sound-effects synth for the game. No audio assets are
 * shipped — every sound is generated procedurally so it stays a few hundred
 * bytes of code rather than a network request.
 *
 * The AudioContext is created lazily on first play (browsers block audio
 * until a user gesture; the first slide/match qualifies). All sounds are
 * no-ops when `enabled` is false or the context can't be created.
 */

let ctx: AudioContext | null = null;

/**
 * Initial enabled state is read from the same localStorage key the in-game
 * sound toggle writes (`colorslide:sfx`, JSON-encoded boolean) so the
 * preference applies app-wide — including button clicks on pages that never
 * mount the game. Defaults to on.
 */
function readInitialEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try {
    const raw = localStorage.getItem('colorslide:sfx');
    if (raw === null) return true;
    return JSON.parse(raw) !== false;
  } catch {
    return true;
  }
}

let enabled = readInitialEnabled();

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor =
    window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  return ctx;
}

export function setSfxEnabled(next: boolean): void {
  enabled = next;
}

export function isSfxEnabled(): boolean {
  return enabled;
}

/**
 * A short "pop" — a quick pitch-dropping sine blip with a soft attack.
 * Pitch is randomized a little per call so chained pops (a big match
 * cascade) don't sound robotic. `intensity` (0..1) scales gain + pitch.
 */
export function playPop(intensity = 1): void {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  const jitter = 0.9 + Math.random() * 0.2;
  const startFreq = 520 * jitter * (0.8 + intensity * 0.5);
  const endFreq = 180 * jitter;

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.16);

  const peak = 0.18 * Math.min(1, intensity);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.24);
}

/**
 * A richer "burst" for a cleared group: a pop layered with a tiny noise
 * sparkle, used when four tiles vanish. Slightly louder/longer than a pop.
 */
export function playBurst(intensity = 1): void {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();

  playPop(intensity);

  const now = ac.currentTime;
  const dur = 0.18;
  const frames = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const decay = 1 - i / frames;
    data[i] = (Math.random() * 2 - 1) * decay * decay;
  }

  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1800, now);

  const gain = ac.createGain();
  const peak = 0.08 * Math.min(1, intensity);
  gain.gain.setValueAtTime(peak, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(filter).connect(gain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + dur);
}

/**
 * A short "swish" for a row/column slide — a band-passed noise burst whose
 * center frequency sweeps down, so it reads as a quick whoosh. Kept low and
 * brief because it fires on every cell shift during a drag.
 */
export function playSlide(): void {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();

  const now = ac.currentTime;
  const dur = 0.1;
  const frames = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    const decay = 1 - i / frames;
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  const noise = ac.createBufferSource();
  noise.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  const jitter = 0.9 + Math.random() * 0.2;
  filter.frequency.setValueAtTime(2400 * jitter, now);
  filter.frequency.exponentialRampToValueAtTime(700 * jitter, now + dur);

  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.07, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  noise.connect(filter).connect(gain).connect(ac.destination);
  noise.start(now);
  noise.stop(now + dur);
}

/**
 * A soft UI "click" for button presses — a single very short square blip.
 * Quiet and high so it feels like tactile feedback, not a game sound.
 */
export function playClick(): void {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();

  const now = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(880, now);
  osc.frequency.exponentialRampToValueAtTime(560, now + 0.05);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

  osc.connect(gain).connect(ac.destination);
  osc.start(now);
  osc.stop(now + 0.07);
}

/**
 * A celebratory little fanfare for clearing a level — a bright ascending
 * arpeggio (major triad + octave) with a sparkle tail.
 */
export function playComplete(): void {
  if (!enabled) return;
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();

  const now = ac.currentTime;
  // C5, E5, G5, C6 — a happy major arpeggio.
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const t = now + i * 0.1;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);

    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.36);
  });
}
