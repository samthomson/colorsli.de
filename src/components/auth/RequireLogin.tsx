import type { ReactNode } from 'react';
import { LoginArea } from '@/components/auth/LoginArea';
import { useCurrentUser } from '@/hooks/useCurrentUser';

type RequireLoginProps = {
  /** Reason shown above the LoginArea, e.g. "Log in to track your progress." */
  message?: string;
  children: ReactNode;
};

/**
 * Guards a section of UI behind Nostr login.
 *
 * If the visitor has no current user, renders an inline call-to-action with
 * the login dialog launcher. Once a user is signed in the children render.
 */
export function RequireLogin({ message, children }: RequireLoginProps) {
  const { user } = useCurrentUser();

  if (user) return <>{children}</>;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border-2 border-dashed border-cyan-400/60 bg-white/60 p-8 text-center backdrop-blur">
      <p className="text-base font-semibold text-slate-800">
        {message ?? 'Log in with Nostr to continue.'}
      </p>
      <LoginArea className="w-full" />
    </div>
  );
}
