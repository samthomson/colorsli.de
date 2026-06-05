import { useMemo } from 'react';
import { useSeoMeta } from '@unhead/react';
import { useSearchParams } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { Template } from '@/components/Template';
import { RequireLogin } from '@/components/auth/RequireLogin';
import { LevelEditor } from '@/components/levels/LevelEditor';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLevelByCoordinate } from '@/hooks/useLevelByCoordinate';
import { buildLevelCoordinate } from '@/lib/coordinate';
import { KINDS } from '@/lib/constants';

const Create = () => {
  useSeoMeta({
    title: 'Color Slide - Create',
    description: 'Design and publish your own Color Slide levels.',
  });

  return (
    <Template>
      <RequireLogin message="Log in with Nostr to publish your own levels.">
        <CreateContent />
      </RequireLogin>
    </Template>
  );
};

/**
 * Routes to either the empty editor or the edit-existing-level editor based
 * on the `?edit=<naddr>` query param. Decoding happens here so the editor
 * itself stays presentational.
 */
function CreateContent() {
  const [params] = useSearchParams();
  const editParam = params.get('edit');
  const forkParam = params.get('fork');
  // Edit takes precedence if both are somehow present.
  const naddrParam = editParam ?? forkParam;
  const isFork = !editParam && Boolean(forkParam);

  // Coordinate to fetch — derived from the naddr in the URL. Returns null
  // for any invalid input (wrong prefix, wrong kind, malformed).
  const coordinate = useMemo(() => {
    if (!naddrParam) return null;
    try {
      const decoded = nip19.decode(naddrParam);
      if (decoded.type !== 'naddr') return null;
      const { kind, pubkey, identifier } = decoded.data;
      if (kind !== KINDS.LEVEL) return null;
      return buildLevelCoordinate(pubkey, identifier);
    } catch {
      return null;
    }
  }, [naddrParam]);

  if (!naddrParam) {
    return <LevelEditor />;
  }

  if (!coordinate) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          That {isFork ? 'fork' : 'edit'} link doesn't look right. Returning to a fresh editor.
        </CardContent>
      </Card>
    );
  }

  return <LoadLevelIntoEditor coordinate={coordinate} fork={isFork} />;
}

/**
 * Loads a level by coordinate and hands it to the editor as either an edit
 * (must be the author) or a fork (anyone). Forking skips the author check
 * since it produces a brand-new level under the current user.
 */
function LoadLevelIntoEditor({ coordinate, fork }: { coordinate: string; fork: boolean }) {
  const { user } = useCurrentUser();
  const query = useLevelByCoordinate(coordinate);

  if (query.isLoading) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Could not load that level. It may have been deleted, or your relay isn't carrying it.
        </CardContent>
      </Card>
    );
  }

  // Editing replaces an addressable event, which only its author can do.
  // If a non-author lands on an edit link, fall back to forking so the
  // design isn't a dead end.
  const mustFork = fork || user?.pubkey !== query.data.pubkey;

  return <LevelEditor initial={query.data} fork={mustFork} />;
}

export default Create;
