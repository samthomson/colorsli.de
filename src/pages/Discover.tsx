import { useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Pencil, Play as PlayIcon } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { Template } from '@/components/Template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LevelPreview } from '@/components/levels/LevelPreview';
import { ShareLevelButton } from '@/components/ShareLevelButton';
import { ForkLevelButton } from '@/components/levels/ForkLevelButton';
import { DeleteLevelButton } from '@/components/levels/DeleteLevelButton';
import { ArcadePill } from '@/components/ArcadePill';
import { AdminLevelControls } from '@/components/levels/AdminLevelControls';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useOfficialLevels } from '@/hooks/useOfficialLevels';
import { useUserLevels } from '@/hooks/useUserLevels';
import { isAdmin } from '@/lib/admin';
import { genUserName } from '@/lib/genUserName';
import { KINDS } from '@/lib/constants';
import type { ParsedLevel } from '@/lib/levelEvent';

const Discover = () => {
  useSeoMeta({
    title: 'Color Slide - Discover',
    description: 'Browse community-published Color Slide levels.',
  });

  return (
    <Template
      pageName="Discover"
      subtitle="Community-published levels. Play the official progression on Play."
    >
      <DiscoverContent />
    </Template>
  );
};

function DiscoverContent() {
  const { user } = useCurrentUser();
  const admin = isAdmin(user?.pubkey);
  // We still pull the official list so we can EXCLUDE promoted levels —
  // those already have their own dedicated home on the Play page and
  // shouldn't appear in the community feed.
  const officialQuery = useOfficialLevels();
  const communityQuery = useUserLevels(100);

  const officialCoordSet = useMemo(
    () => new Set(officialQuery.data?.orderedCoordinates ?? []),
    [officialQuery.data?.orderedCoordinates],
  );

  const communityLevels = useMemo(
    () =>
      (communityQuery.data ?? []).filter(
        (level) => !officialCoordSet.has(level.coordinate),
      ),
    [communityQuery.data, officialCoordSet],
  );

  // Wait for both queries to resolve before deciding the feed is empty —
  // otherwise the first render sees no official set yet and would briefly
  // show official levels that we'd then filter out.
  const isLoading = communityQuery.isLoading || officialQuery.isLoading;

  return (
    <div className="space-y-4">
      {isLoading ? (
        <LevelListSkeleton />
      ) : communityLevels.length === 0 ? (
        <EmptyCard message="No community levels published yet. Be the first — head to Create." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {communityLevels.map((level) => (
            <LevelCard
              key={level.coordinate}
              level={level}
              isOfficial={false}
              showAdminControls={admin}
              currentUserPubkey={user?.pubkey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LevelCard({
  level,
  badge,
  isOfficial,
  showAdminControls,
  showReorder = false,
  currentUserPubkey,
}: {
  level: ParsedLevel;
  badge?: string;
  isOfficial: boolean;
  showAdminControls: boolean;
  showReorder?: boolean;
  currentUserPubkey?: string;
}) {
  const author = useAuthor(level.pubkey);
  const name = author.data?.metadata?.name ?? genUserName(level.pubkey);
  const npub = nip19.npubEncode(level.pubkey);
  const isOwn = currentUserPubkey === level.pubkey;
  // naddr is the canonical NIP-19 form for an addressable event. The
  // editor consumes it via `/create?edit=<naddr>`, the player via
  // `/play?level=<naddr>` (same one-off load path for both flows).
  const naddr = nip19.naddrEncode({
    identifier: level.dTag,
    pubkey: level.pubkey,
    kind: KINDS.LEVEL,
  });

  return (
    <Card className="border-cyan-200/50 bg-white/70 backdrop-blur">
      <CardHeader className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="arcade-label text-[10px] text-slate-500">
            {badge ?? `${level.rows}x${level.cols}`}
          </span>
          {isOfficial && (
            <span className="arcade-label rounded-full bg-amber-100 px-2 py-0.5 text-[9px] text-amber-700">
              Official
            </span>
          )}
        </div>
        <CardTitle className="brand-arcade-title bg-clip-text text-transparent line-clamp-2 text-xl leading-tight sm:text-2xl">
          {level.title}
        </CardTitle>
        <Link
          to={`/${npub}`}
          className="arcade-label truncate text-[10px] text-slate-500 hover:text-cyan-700"
        >
          by {name}
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <LevelPreview board={level.board} tiles={level.tiles} />
        <div className="space-y-2">
          <ArcadePill asChild tone="cyan" size="md" className="w-full justify-center">
            <Link to={`/play?level=${naddr}`}>
              <PlayIcon />
              Play
            </Link>
          </ArcadePill>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ShareLevelButton level={level} tone="emerald" />
            <ForkLevelButton level={level} tone="indigo" />
            {isOwn && (
              <>
                <ArcadePill asChild tone="amber" size="sm">
                  <Link to={`/create?edit=${naddr}`}>
                    <Pencil />
                    Edit
                  </Link>
                </ArcadePill>
                <DeleteLevelButton level={level} tone="red" />
              </>
            )}
          </div>
        </div>
        {showAdminControls && (
          <AdminLevelControls
            levelCoordinate={level.coordinate}
            showReorder={showReorder}
          />
        )}
      </CardContent>
    </Card>
  );
}

function LevelListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-slate-200/70 bg-white/60 p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-32 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="arcade-label py-10 text-center text-[11px] text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export default Discover;
