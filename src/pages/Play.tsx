import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Template } from '@/components/Template';
import { RequireLogin } from '@/components/auth/RequireLogin';
import { LevelGrid } from '@/components/levels/LevelGrid';
import { LevelPlayer } from '@/components/levels/LevelPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompletedLevels } from '@/hooks/useCompletedLevels';
import { useOfficialLevels } from '@/hooks/useOfficialLevels';
import type { ParsedLevel } from '@/lib/levelEvent';

const Play = () => {
  useSeoMeta({
    title: 'Color Slide - Play',
    description: 'Climb the official Color Slide level progression.',
  });

  return (
    <Template pageName="Play" subtitle="Beat each level to unlock the next.">
      <RequireLogin message="Log in with Nostr to play levels and save your scores.">
        <PlayContent />
      </RequireLogin>
    </Template>
  );
};

function PlayContent() {
  const officialLevels = useOfficialLevels();
  const { completedCoordinates, isLoading: saveLoading } = useCompletedLevels();
  // Track the active level by addressable coordinate (stable across edits);
  // deriving the level object from the live list avoids any setState-in-effect.
  const [activeCoordinate, setActiveCoordinate] = useState<string | null>(null);

  const levels = officialLevels.data?.levels ?? [];
  const activeLevel: ParsedLevel | null = activeCoordinate
    ? levels.find((l) => l.coordinate === activeCoordinate) ?? null
    : null;

  if (officialLevels.isLoading || saveLoading) {
    return <PlaySkeleton />;
  }

  if (officialLevels.isError) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-muted-foreground">
          Could not load official levels. Try again in a moment.
        </CardContent>
      </Card>
    );
  }

  if (activeLevel) {
    const idx = levels.findIndex(l => l.coordinate === activeLevel.coordinate);
    const next = idx >= 0 && idx + 1 < levels.length ? levels[idx + 1] : null;
    return (
      <LevelPlayer
        level={activeLevel}
        nextLevel={next}
        onBack={() => setActiveCoordinate(null)}
        onAdvance={(n) => setActiveCoordinate(n.coordinate)}
      />
    );
  }

  if (levels.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No official levels yet</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          Once an admin curates levels they will appear here in order. In the meantime,
          warm up on a random board in Practice or browse community-published levels in Discover.
        </CardContent>
      </Card>
    );
  }

  return (
    <LevelGrid
      levels={levels}
      completedCoordinates={completedCoordinates}
      onSelect={(level) => setActiveCoordinate(level.coordinate)}
    />
  );
}

function PlaySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border-2 border-slate-200/70 bg-white/60 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      ))}
    </div>
  );
}

export default Play;
