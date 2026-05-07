import { useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Template } from '@/components/Template';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { LevelPreview } from '@/components/levels/LevelPreview';
import { AdminLevelControls } from '@/components/levels/AdminLevelControls';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useOfficialLevels } from '@/hooks/useOfficialLevels';
import { useUserLevels } from '@/hooks/useUserLevels';
import { isAdmin } from '@/lib/admin';
import { genUserName } from '@/lib/genUserName';
import { nip19 } from 'nostr-tools';
import type { ParsedLevel } from '@/lib/levelEvent';

const Discover = () => {
  useSeoMeta({
    title: 'Color Slide - Discover',
    description: 'Browse community-published Color Slide levels and the official progression.',
  });

  return (
    <Template pageName="Discover" subtitle="The official progression and every community level.">
      <DiscoverContent />
    </Template>
  );
};

function DiscoverContent() {
  const { user } = useCurrentUser();
  const admin = isAdmin(user?.pubkey);
  const officialQuery = useOfficialLevels();
  const communityQuery = useUserLevels(100);

  const officialLevels = officialQuery.data?.levels ?? [];
  const officialIdSet = useMemo(
    () => new Set(officialQuery.data?.orderedIds ?? []),
    [officialQuery.data?.orderedIds],
  );

  const communityLevels = communityQuery.data ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <SectionHeader
          title="Official progression"
          subtitle="Curated levels you play in order on the Practice page."
        />
        {officialQuery.isLoading ? (
          <LevelListSkeleton />
        ) : officialLevels.length === 0 ? (
          <EmptyCard message="No official levels yet — admins, add some from the community list below." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {officialLevels.map((level, i) => (
              <LevelCard
                key={level.id}
                level={level}
                badge={`Level ${i + 1}`}
                isOfficial
                showAdminControls={admin}
                showReorder
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="Community levels"
          subtitle="Recently published by other players. Anyone can publish."
        />
        {communityQuery.isLoading ? (
          <LevelListSkeleton />
        ) : communityLevels.length === 0 ? (
          <EmptyCard message="No community levels published yet. Be the first — head to Create." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communityLevels.map((level) => (
              <LevelCard
                key={level.id}
                level={level}
                isOfficial={officialIdSet.has(level.id)}
                showAdminControls={admin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-black uppercase tracking-widest text-slate-800 sm:text-xl">
        {title}
      </h2>
      <p className="text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

function LevelCard({
  level,
  badge,
  isOfficial,
  showAdminControls,
  showReorder = false,
}: {
  level: ParsedLevel;
  badge?: string;
  isOfficial: boolean;
  showAdminControls: boolean;
  showReorder?: boolean;
}) {
  const author = useAuthor(level.pubkey);
  const name = author.data?.metadata?.name ?? genUserName(level.pubkey);
  const npub = nip19.npubEncode(level.pubkey);

  return (
    <Card className="border-cyan-200/50 bg-white/70 backdrop-blur">
      <CardHeader className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
            {badge ?? `${level.rows}x${level.cols}`}
          </span>
          {isOfficial && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-700">
              Official
            </span>
          )}
        </div>
        <CardTitle className="line-clamp-2 text-base font-bold text-slate-900">
          {level.title}
        </CardTitle>
        <Link
          to={`/${npub}`}
          className="truncate text-xs text-slate-500 hover:text-cyan-700"
        >
          by {name}
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        <LevelPreview board={level.board} />
        {showAdminControls && (
          <AdminLevelControls levelEventId={level.id} showReorder={showReorder} />
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
      <CardContent className="py-10 text-center text-sm text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );
}

export default Discover;
