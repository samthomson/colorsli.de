import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ColourSlideGame, type CompletionResult } from '@/components/ColourSlideGame';
import { ShareLevelButton } from '@/components/ShareLevelButton';
import {
  LevelCompleteDialog,
  type SaveStatus,
} from '@/components/levels/LevelCompleteDialog';
import { YouTubeBackground } from '@/components/levels/YouTubeBackground';
import { useAppContext } from '@/hooks/useAppContext';
import { useLocalStorage, useSessionStorage } from '@/hooks/useLocalStorage';
import { usePublishCompletion } from '@/hooks/usePublishCompletion';
import { useUpdateSaveGame } from '@/hooks/useUpdateSaveGame';
import type { ParsedLevel } from '@/lib/levelEvent';

type LevelPlayerProps = {
  level: ParsedLevel;
  /** Optional next level to advance to after a clear. */
  nextLevel?: ParsedLevel | null;
  onBack: () => void;
  onAdvance?: (next: ParsedLevel) => void;
};

/**
 * Plays one level inside `ColourSlideGame`. On clear:
 *   1. Always update the encrypted save game (drives unlock).
 *   2. If `config.publishCompletions`, also publish a public kind-1 score event.
 *   3. Show a celebration modal with retry hooks for either operation.
 */
export function LevelPlayer({ level, nextLevel, onBack, onAdvance }: LevelPlayerProps) {
  const navigate = useNavigate();
  const { config, updateConfig } = useAppContext();
  const updateSaveGame = useUpdateSaveGame();
  const { publishCompletion } = usePublishCompletion();

  const [result, setResult] = useState<CompletionResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Music preference is owned here so the toggle in the header and the
  // YouTubeBackground iframe stay perfectly in sync without context plumbing.
  const [musicUnmuted, setMusicUnmuted] = useLocalStorage<boolean>(
    'colorslide:music-unmuted',
    true,
  );

  // Press-Start splash gate. Held here so the music toggle in the header
  // can be hidden until the player has actually launched the level
  // (showing it pre-start looks weird — there's nothing to toggle yet).
  const [started, setStarted] = useSessionStorage<boolean>('colorslide:audio-unlocked', false);
  const [, setLevelMusicActive] = useSessionStorage<boolean>('colorslide:level-music-active', false);

  // Tell the app-wide menu-music layer when a level's own YouTube track is active.
  useEffect(() => {
    const active = Boolean(level.youtubeUrl) && started;
    setLevelMusicActive(active);
    return () => setLevelMusicActive(false);
  }, [level.youtubeUrl, started, setLevelMusicActive]);

  const runSave = useCallback(
    async (r: CompletionResult) => {
      setSaveStatus('pending');
      try {
        await updateSaveGame({
          levelCoordinate: level.coordinate,
          levelTitle: level.title,
        });
        setSaveStatus('success');
      } catch (err) {
        console.error('save game write failed', err);
        setSaveStatus('error');
      }
      void r;
    },
    [updateSaveGame, level.coordinate, level.title],
  );

  // Fire-and-forget public publish — only invoked when the user commits via
  // a CTA in the dialog. Failures land in the global pending events queue
  // (no need to block navigation on a relay round-trip).
  const publishIfOptedIn = useCallback(
    (r: CompletionResult) => {
      if (!config.publishCompletions) return;
      void publishCompletion({
        levelCoordinate: level.coordinate,
        levelTitle: level.title,
        score: r.score,
        seconds: r.seconds,
        moves: r.moves,
      }).catch((err) => {
        console.error('completion publish failed', err);
      });
    },
    [config.publishCompletions, publishCompletion, level.coordinate, level.title],
  );

  const handleComplete = useCallback(
    (r: CompletionResult) => {
      setResult(r);
      void runSave(r);
    },
    [runSave],
  );

  const handleShareToggle = useCallback(
    (next: boolean) => {
      updateConfig((cur) => ({ ...cur, publishCompletions: next }));
    },
    [updateConfig],
  );

  const handleAdvance = useCallback(() => {
    if (!nextLevel || !onAdvance || !result) return;
    publishIfOptedIn(result);
    setResult(null);
    setSaveStatus('idle');
    onAdvance(nextLevel);
  }, [nextLevel, onAdvance, result, publishIfOptedIn]);

  const handleExit = useCallback(() => {
    if (result) publishIfOptedIn(result);
    navigate('/');
  }, [result, publishIfOptedIn, navigate]);

  return (
    <div className="relative flex flex-col items-center gap-6">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="arcade-label gap-1 text-[10px]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to levels
        </Button>
        <ShareLevelButton level={level} />
      </div>

      <ColourSlideGame
        key={level.coordinate}
        initialBoard={level.board}
        initialTiles={level.tiles}
        levelLabel={level.title}
        onComplete={handleComplete}
        started={started}
      />

      <YouTubeBackground
        key={`yt-${level.coordinate}`}
        url={level.youtubeUrl}
        unmuted={musicUnmuted}
        onUnmutedChange={setMusicUnmuted}
        started={started}
        onStartedChange={setStarted}
      />

      {result && (
        <LevelCompleteDialog
          open={result !== null}
          levelTitle={level.title}
          result={result}
          saveStatus={saveStatus}
          shareEnabled={config.publishCompletions}
          onShareToggle={handleShareToggle}
          onRetrySave={() => { void runSave(result); }}
          onAdvance={nextLevel && onAdvance ? handleAdvance : undefined}
          onExit={handleExit}
        />
      )}
    </div>
  );
}
