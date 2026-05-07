import { ArrowDown, ArrowUp, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfficialListActions } from '@/hooks/useOfficialListActions';
import { useToast } from '@/hooks/useToast';

type AdminLevelControlsProps = {
  /** Addressable coordinate of the level (`kind:pubkey:d`). */
  levelCoordinate: string;
  /** Hide reorder buttons when not viewing the official list. */
  showReorder?: boolean;
};

/**
 * Admin-only controls to add/remove/reorder a level in the official progression
 * list. Renders nothing if the current user is not an admin.
 */
export function AdminLevelControls({ levelCoordinate, showReorder = false }: AdminLevelControlsProps) {
  const { canEdit, isPending, isOfficial, addLevel, removeLevel, move } = useOfficialListActions();
  const { toast } = useToast();

  if (!canEdit) return null;

  const inList = isOfficial(levelCoordinate);

  const wrap = (label: string, fn: () => Promise<void>) => async () => {
    try {
      await fn();
      toast({ title: label, description: 'Official list updated.' });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Failed to update list',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {inList ? (
        <>
          {showReorder && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={wrap('Moved up', () => move(levelCoordinate, 'up'))}
                aria-label="Move up"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={wrap('Moved down', () => move(levelCoordinate, 'down'))}
                aria-label="Move down"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={wrap('Removed from official', () => removeLevel(levelCoordinate))}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            Remove from official
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          disabled={isPending}
          onClick={wrap('Added to official', () => addLevel(levelCoordinate))}
          className="gap-1"
        >
          <Star className="h-4 w-4" />
          Add to official
        </Button>
      )}
    </div>
  );
}
