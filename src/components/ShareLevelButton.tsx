import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useShareLevel } from '@/hooks/useShareLevel';
import { useToast } from '@/hooks/useToast';
import type { ParsedLevel } from '@/lib/levelEvent';

interface ShareLevelButtonProps {
  level: ParsedLevel;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ShareLevelButton({ 
  level, 
  variant = 'outline', 
  size = 'sm',
  className 
}: ShareLevelButtonProps) {
  const { user } = useCurrentUser();
  const { shareLevel, isPending } = useShareLevel();
  const { toast } = useToast();

  const handleShare = async () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to share levels.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await shareLevel(level);
      toast({
        title: 'Level shared',
        description: 'Posted to your Nostr feed.',
      });
    } catch (error) {
      console.error('Failed to share level:', error);
      toast({
        title: 'Share failed',
        description: 'Could not share the level. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={isPending}
      className={className}
    >
      <Share2 className="h-4 w-4" />
      {isPending ? 'Sharing...' : 'Share'}
    </Button>
  );
}