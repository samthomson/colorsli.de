import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { Template } from '@/components/Template';
import { RequireLogin } from '@/components/auth/RequireLogin';
import { LevelGrid } from '@/components/levels/LevelGrid';
import { LevelPlayer } from '@/components/levels/LevelPlayer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompletedLevels } from '@/hooks/useCompletedLevels';
import { useLevelByCoordinate } from '@/hooks/useLevelByCoordinate';
import { useOfficialLevels } from '@/hooks/useOfficialLevels';
import { KINDS } from '@/lib/constants';
import { buildLevelCoordinate } from '@/lib/coordinate';
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

/**
 * Two modes:
 *
 *   1. **Standalone level via `?level=<naddr>`** — used by Discover's Play
 *      button. Loads that single level by coordinate and plays it. Back
 *      navigates to `/discover`.
 *
 *   2. **Official progression (no query param)** — the historical Play
 *      experience: render the gated `LevelGrid`, advance to next on
 *      completion. Back navigates within the grid.
 */
function PlayContent() {
  const [params] = useSearchParams();
  const levelParam = params.get('level');

  const standaloneCoordinate = useMemo(() => {
    if (!levelParam) return null;
    try {
      const decoded = nip19.decode(levelParam);
      if (decoded.type !== 'naddr') return null;
      const { kind, pubkey, identifier } = decoded.data;
      if (kind !== KINDS.LEVEL) return null;
      return buildLevelCoordinate(pubkey, identifier);
    } catch {
      return null;
    }
  }, [levelParam]);

  if (levelParam) {
    return <StandaloneLevel coordinate={standaloneCoordinate} />;
  }

  return <OfficialProgression />;
}

function StandaloneLevel({ coordinate }: { coordinate: string | null }) {
  const navigate = useNavigate();
  const query = useLevelByCoordinate(coordinate ?? undefined);

  if (!coordinate) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          That play link doesn't look right. Browse community levels on Discover.
        </CardContent>
      </Card>
    );
  }

  if (query.isLoading) return <PlaySkeleton />;

  if (query.isError || !query.data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Could not load that level. It may have been deleted, or your relay isn't carrying it.
        </CardContent>
      </Card>
    );
  }

  return (
    <LevelPlayer
      level={query.data}
      onBack={() => navigate('/discover')}
    />
  );
}

function OfficialProgression() {
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
