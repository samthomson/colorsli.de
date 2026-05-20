import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { ColourSlideGame } from '@/components/ColourSlideGame';
import { YouTubeBackground } from '@/components/levels/YouTubeBackground';
import {
  LevelCompleteDialog,
  type SaveStatus,
} from '@/components/levels/LevelCompleteDialog';
import { useLocalStorage, useSessionStorage } from '@/hooks/useLocalStorage';
import type { CompletionResult } from '@/components/ColourSlideGame';

/**
 * Default soundtrack played behind random practice boards. The Press-Start
 * splash + music toggle behave identically to a real level so the practice
 * mode feels consistent with story play (and satisfies the same browser
 * autoplay-with-sound gesture requirement).
 */
const PRACTICE_MUSIC_URL = 'https://www.youtube.com/watch?v=rZjBLC8e2Es';

const Practice = () => {
  const navigate = useNavigate();

  useSeoMeta({
    title: 'Color Slide - Practice',
    description: 'Warm up on randomly generated boards.',
  });

  // Shared key with LevelPlayer so the player's mute preference is sticky
  // across both modes — toggle once, stays toggled everywhere.
  const [musicUnmuted, setMusicUnmuted] = useLocalStorage<boolean>(
    'colorslide:music-unmuted',
    true,
  );

  // Press-Start splash gate — shared with LevelPlayer via session storage.
  const [started, setStarted] = useSessionStorage<boolean>('colorslide:audio-unlocked', false);
  const [, setLevelMusicActive] = useSessionStorage<boolean>('colorslide:level-music-active', false);

  // Signal MenuMusicLayer that practice music is active.
  useEffect(() => {
    const active = started;
    setLevelMusicActive(active);
    return () => setLevelMusicActive(false);
  }, [started, setLevelMusicActive]);

  // Bumping `gameKey` force-remounts ColourSlideGame, generating a fresh
  // random board (used by the "Play Again" CTA in the completion modal).
  const [gameKey, setGameKey] = useState(0);

  const [result, setResult] = useState<CompletionResult | null>(null);

  // Practice mode never writes to Nostr — no save, no kind-1. The dialog's
  // share/save UI is hidden by leaving these props undefined; we only need
  // the local result for stat display.
  const saveStatus: SaveStatus = 'idle';

  return (
    <Template pageName="Practice" subtitle="Random boards. No saving, no scoring — just play.">
      <div className="relative flex flex-col items-center gap-6">
        <ColourSlideGame
          key={gameKey}
          onComplete={(r) => setResult(r)}
          started={started}
        />

        <YouTubeBackground
          url={PRACTICE_MUSIC_URL}
          unmuted={musicUnmuted}
          onUnmutedChange={setMusicUnmuted}
          started={started}
          onStartedChange={setStarted}
        />
      </div>

      <LevelCompleteDialog
        open={result !== null}
        levelTitle="Practice"
        result={result ?? { score: 0, seconds: 0, moves: 0 }}
        saveStatus={saveStatus}
        onPlayAgain={() => {
          setResult(null);
          setGameKey((k) => k + 1);
        }}
        onExit={() => {
          setResult(null);
          navigate('/');
        }}
      />
    </Template>
  );
};

export default Practice;
