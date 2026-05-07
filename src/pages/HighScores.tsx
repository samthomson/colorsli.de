import { useMemo, useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Template } from '@/components/Template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthor } from '@/hooks/useAuthor';
import { useGlobalLeaderboard, type GlobalLeaderboardEntry } from '@/hooks/useGlobalLeaderboard';
import { useLevelLeaderboard, type LevelLeaderboardEntry } from '@/hooks/useLevelLeaderboard';
import { useOfficialLevels } from '@/hooks/useOfficialLevels';
import { useUserLevels } from '@/hooks/useUserLevels';
import { genUserName } from '@/lib/genUserName';
import { formatTime } from '@/lib/scoring';
import { cn } from '@/lib/utils';
import type { ParsedLevel } from '@/lib/levelEvent';

const HighScores = () => {
  useSeoMeta({
    title: 'Color Slide - High Scores',
    description: 'Global and per-level leaderboards for Color Slide.',
  });

  return (
    <Template pageName="High Scores" subtitle="Top runs from across Nostr.">
      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="per-level">Per Level</TabsTrigger>
        </TabsList>
        <TabsContent value="global" className="mt-4">
          <GlobalBoard />
        </TabsContent>
        <TabsContent value="per-level" className="mt-4">
          <PerLevelBoard />
        </TabsContent>
      </Tabs>
    </Template>
  );
};

function GlobalBoard() {
  const { data, isLoading } = useGlobalLeaderboard();

  return (
    <Card className="border-cyan-300/40 bg-white/70 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-900">Global leaderboard</CardTitle>
        <p className="text-xs text-slate-600">
          Sum of each player's best score on every level they have completed.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <BoardSkeleton />
        ) : !data || data.length === 0 ? (
          <EmptyRow message="No completions yet. Be the first to clear a level." />
        ) : (
          data.slice(0, 50).map((entry, i) => (
            <GlobalRow key={entry.pubkey} rank={i + 1} entry={entry} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function GlobalRow({ rank, entry }: { rank: number; entry: GlobalLeaderboardEntry }) {
  const author = useAuthor(entry.pubkey);
  const name = author.data?.metadata?.name ?? genUserName(entry.pubkey);
  const npub = nip19.npubEncode(entry.pubkey);

  return (
    <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5">
      <span className={cn('w-9 text-center text-sm font-black', rankColor(rank))}>#{rank}</span>
      <div className="min-w-0">
        <Link to={`/${npub}`} className="truncate text-sm font-semibold text-slate-900 hover:text-cyan-700">
          {name}
        </Link>
        <p className="text-xs text-slate-500">{entry.levelsCompleted} level{entry.levelsCompleted === 1 ? '' : 's'}</p>
      </div>
      <span className="text-sm font-black text-cyan-700">{entry.totalScore.toLocaleString()}</span>
    </div>
  );
}

function PerLevelBoard() {
  const officialQuery = useOfficialLevels();
  const userLevelsQuery = useUserLevels(100);

  const allLevels: ParsedLevel[] = useMemo(() => {
    const official = officialQuery.data?.levels ?? [];
    const officialIds = new Set(officialQuery.data?.orderedIds ?? []);
    const community = (userLevelsQuery.data ?? []).filter((l) => !officialIds.has(l.id));
    return [...official, ...community];
  }, [officialQuery.data, userLevelsQuery.data]);

  // Derived selection: defaults to the first level until the user picks one.
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const effectiveId = selectedId ?? allLevels[0]?.id;

  const isLoading = officialQuery.isLoading || userLevelsQuery.isLoading;

  if (isLoading) return <BoardSkeleton />;

  if (allLevels.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No levels published yet. Head to Create to publish the first one.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-cyan-300/40 bg-white/70 backdrop-blur">
      <CardHeader className="space-y-3">
        <CardTitle className="text-xl font-bold text-slate-900">Per-level leaderboard</CardTitle>
        <Select value={effectiveId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Choose a level" />
          </SelectTrigger>
          <SelectContent>
            {allLevels.map((level) => (
              <SelectItem key={level.id} value={level.id}>
                {level.title} ({level.rows}x{level.cols})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-2">
        <LevelBoard levelId={effectiveId} />
      </CardContent>
    </Card>
  );
}

function LevelBoard({ levelId }: { levelId: string | undefined }) {
  const { data, isLoading } = useLevelLeaderboard(levelId);

  if (isLoading) return <BoardSkeleton />;
  if (!data || data.length === 0) return <EmptyRow message="No completions yet for this level." />;

  return (
    <>
      {data.slice(0, 50).map((entry, i) => (
        <LevelRow key={entry.pubkey} rank={i + 1} entry={entry} />
      ))}
    </>
  );
}

function LevelRow({ rank, entry }: { rank: number; entry: LevelLeaderboardEntry }) {
  const author = useAuthor(entry.pubkey);
  const name = author.data?.metadata?.name ?? genUserName(entry.pubkey);
  const npub = nip19.npubEncode(entry.pubkey);

  return (
    <div className="grid grid-cols-[auto,1fr,auto] items-center gap-3 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5">
      <span className={cn('w-9 text-center text-sm font-black', rankColor(rank))}>#{rank}</span>
      <div className="min-w-0">
        <Link to={`/${npub}`} className="truncate text-sm font-semibold text-slate-900 hover:text-cyan-700">
          {name}
        </Link>
        <p className="text-xs text-slate-500">
          {formatTime(entry.seconds)} · {entry.moves} moves
        </p>
      </div>
      <span className="text-sm font-black text-cyan-700">{entry.score.toLocaleString()}</span>
    </div>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/40 px-3 py-8 text-center text-sm text-slate-600">
      {message}
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5">
          <Skeleton className="h-4 w-8" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-500';
  if (rank === 2) return 'text-slate-400';
  if (rank === 3) return 'text-orange-500';
  return 'text-slate-600';
}

export default HighScores;
