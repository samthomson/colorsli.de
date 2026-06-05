import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ArcadePill } from '@/components/ArcadePill';
import { useDeleteLevel } from '@/hooks/useDeleteLevel';
import { useToast } from '@/hooks/useToast';
import type { ParsedLevel } from '@/lib/levelEvent';

type DeleteLevelButtonProps = {
  level: ParsedLevel;
  tone?: 'cyan' | 'amber' | 'emerald' | 'red' | 'indigo' | 'rainbow' | 'slate';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Called after a successful deletion (e.g. to navigate away). */
  onDeleted?: () => void;
};

/**
 * Confirms, then publishes a NIP-09 deletion for one of the current user's
 * own levels. Render only when the viewer is the level's author — a kind-5
 * from anyone else is ignored by relays for events they didn't sign.
 */
export function DeleteLevelButton({
  level,
  tone = 'red',
  size = 'sm',
  className,
  onDeleted,
}: DeleteLevelButtonProps) {
  const { deleteLevel, isPending } = useDeleteLevel();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteLevel(level);
      toast({
        title: 'Level deleted',
        description: 'Removed from Discover. Relays honoring deletions will drop it.',
      });
      onDeleted?.();
    } catch (err) {
      console.error('Failed to delete level:', err);
      toast({
        title: 'Delete failed',
        description: 'Could not delete the level. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <ArcadePill tone={tone} size={size} disabled={isPending} className={className}>
          <Trash2 />
          {isPending ? 'Deleting...' : 'Delete'}
        </ArcadePill>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this level?</AlertDialogTitle>
          <AlertDialogDescription>
            “{level.title}” will be removed from Discover. This publishes a deletion
            request to Nostr — relays that honor it will drop the level. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
