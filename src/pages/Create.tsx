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
    <Template pageName="Create" subtitle="Design a board, validate it, publish it to Nostr.">
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

  // Coordinate to fetch — derived from the naddr in the URL. Returns null
  // for any invalid input (wrong prefix, wrong kind, malformed).
  const coordinate = useMemo(() => {
    if (!editParam) return null;
    try {
      const decoded = nip19.decode(editParam);
      if (decoded.type !== 'naddr') return null;
      const { kind, pubkey, identifier } = decoded.data;
      if (kind !== KINDS.LEVEL) return null;
      return buildLevelCoordinate(pubkey, identifier);
    } catch {
      return null;
    }
  }, [editParam]);

  if (!editParam) {
    return <LevelEditor />;
  }

  if (!coordinate) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          That edit link doesn't look right. Returning to a fresh editor.
        </CardContent>
      </Card>
    );
  }

  return <EditExistingLevel coordinate={coordinate} />;
}

function EditExistingLevel({ coordinate }: { coordinate: string }) {
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

  // Only the author can replace an addressable event, so any other viewer
  // gets a friendly message instead of an editor that would silently fail.
  if (user?.pubkey !== query.data.pubkey) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Only the author of a level can edit it. Try forking the design in a fresh editor instead.
        </CardContent>
      </Card>
    );
  }

  return <LevelEditor initial={query.data} />;
}

export default Create;
