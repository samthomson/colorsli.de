import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { ArcadePill, arcadePillIconSize } from '@/components/ArcadePill';
import AuthDialog from './AuthDialog';
import { useLoggedInAccounts } from '@/hooks/useLoggedInAccounts';
import { AccountSwitcher } from './AccountSwitcher';
import { cn } from '@/lib/utils';

export interface LoginAreaProps {
  className?: string;
}

export function LoginArea({ className }: LoginAreaProps) {
  const { currentUser } = useLoggedInAccounts();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      {currentUser ? (
        <AccountSwitcher onAddAccountClick={() => setAuthDialogOpen(true)} />
      ) : (
        <ArcadePill
          tone="emerald"
          size="sm"
          onClick={() => setAuthDialogOpen(true)}
          style={{ animationDelay: '1.4s' }}
        >
          <LogIn className={`${arcadePillIconSize('sm')} drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]`} />
          Nostr Login
        </ArcadePill>
      )}

      <AuthDialog
        isOpen={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
      />
    </div>
  );
}
