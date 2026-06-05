import { useMemo } from 'react';
import { nip19 } from 'nostr-tools';
import { useParams } from 'react-router-dom';
import { KINDS } from '@/lib/constants';
import { buildLevelCoordinate } from '@/lib/coordinate';
import { useLevelByCoordinate } from '@/hooks/useLevelByCoordinate';
import { LevelPlayer } from '@/components/levels/LevelPlayer';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import NotFound from './NotFound';

export function NIP19Page() {
  const { nip19: identifier } = useParams<{ nip19: string }>();
  const navigate = useNavigate();

  const coordinate = useMemo(() => {
    if (!identifier) return null;
    
    try {
      const decoded = nip19.decode(identifier);
      
      // Only handle Color Slide levels for now
      if (decoded.type === 'naddr' && decoded.data.kind === KINDS.LEVEL) {
        const { pubkey, identifier: dTag } = decoded.data;
        return buildLevelCoordinate(pubkey, dTag);
      }
      
      return null;
    } catch {
      return null;
    }
  }, [identifier]);

  const query = useLevelByCoordinate(coordinate ?? undefined);

  // Not a Color Slide level or invalid identifier
  if (!coordinate) {
    return <NotFound />;
  }

  // Loading state
  if (query.isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-96 w-full max-w-2xl" />
        </div>
      </div>
    );
  }

  // Level not found or error
  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Could not load that level. It may have been deleted, or your relay isn't carrying it.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the level player directly
  return (
    <div className="container mx-auto px-4 py-8">
      <LevelPlayer
        level={query.data}
        onBack={() => navigate('/discover')}
      />
    </div>
  );
} 