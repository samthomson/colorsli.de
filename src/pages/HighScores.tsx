import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ScoreEntry = {
  rank: number;
  player: string;
  score: number;
  board: string;
  moves: number;
};

const highScores: ScoreEntry[] = [
  { rank: 1, player: 'NeonFox', score: 9820, board: '10x10', moves: 43 },
  { rank: 2, player: 'PixelMint', score: 9510, board: '9x9', moves: 39 },
  { rank: 3, player: 'ArcadeAri', score: 9240, board: '10x10', moves: 48 },
  { rank: 4, player: 'SlideWizard', score: 9030, board: '8x8', moves: 35 },
  { rank: 5, player: 'Chromatic', score: 8890, board: '11x11', moves: 57 },
  { rank: 6, player: 'GlowByte', score: 8610, board: '7x7', moves: 30 },
  { rank: 7, player: 'TurboHue', score: 8440, board: '9x9', moves: 46 },
  { rank: 8, player: 'PrismPilot', score: 8260, board: '8x8', moves: 41 },
];

const HighScores = () => {
  useSeoMeta({
    title: 'Color Slide - High Scores',
    description: 'Track top Color Slide runs and leaderboard records.',
  });

  return (
    <Template title="High Scores" subtitle="Top runs from Color Slide.">
      <Card className="border-fuchsia-300/25 bg-black/30">
        <CardHeader>
          <CardTitle className="text-xl text-fuchsia-100 sm:text-2xl">Global Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {highScores.map((entry) => (
            <div
              key={entry.rank}
              className="grid grid-cols-[auto,1fr,auto] items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5"
            >
              <span className="w-9 text-center text-sm font-black text-cyan-100">#{entry.rank}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{entry.player}</p>
                <p className="text-xs text-violet-100/70">
                  Board {entry.board} • {entry.moves} moves
                </p>
              </div>
              <span className="text-sm font-black text-fuchsia-100">{entry.score.toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </Template>
  );
};

export default HighScores;
