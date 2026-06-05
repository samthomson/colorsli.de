import { Repeat2 } from 'lucide-react';
import { ArcadePill } from '@/components/ArcadePill';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useShareLevel } from '@/hooks/useShareLevel';
import { useToast } from '@/hooks/useToast';
import type { ParsedLevel } from '@/lib/levelEvent';

interface ShareLevelButtonProps {
  level: ParsedLevel;
  tone?: 'cyan' | 'amber' | 'emerald' | 'red' | 'indigo' | 'rainbow';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ShareLevelButton({ 
  level, 
  tone = 'indigo', 
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
    <ArcadePill
      tone={tone}
      size={size}
      onClick={handleShare}
      disabled={isPending}
      className={className}
    >
      <Repeat2 />
      {isPending ? 'Sharing...' : 'Share'}
    </ArcadePill>
  );
}