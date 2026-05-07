import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { BrandLogo } from '@/components/BrandLogo';
import { CirclesBackground } from '@/components/CirclesBackground';
import { PendingEventsBadge } from '@/components/PendingEventsBadge';
import { LoginArea } from '@/components/auth/LoginArea';

type TemplateProps = {
  pageName?: string;
  subtitle?: string;
  children: ReactNode;
  showExit?: boolean;
  brandVariant?: 'hero' | 'page';
};

export function Template({
  pageName,
  subtitle,
  children,
  showExit = true,
  brandVariant = 'page',
}: TemplateProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#fff5e6] text-[#2a1050]">
      <CirclesBackground />

      <header className="relative z-20 flex items-center justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6">
        {showExit ? (
          <ArcadePill asChild tone="cyan" size="sm">
            <Link to="/" aria-label="Back to home">
              <ArcadePillIcon tone="cyan" size="sm">
                <Home className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              <span className="hidden sm:inline">Home</span>
            </Link>
          </ArcadePill>
        ) : <span aria-hidden />}
        <div className="flex items-center gap-2">
          <PendingEventsBadge />
          <LoginArea className="max-w-60" />
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:px-6 sm:pt-8">
        <div className="rounded-3xl border-2 border-white/70 bg-white/35 p-4 shadow-[0_8px_40px_rgba(120,60,200,0.18)] backdrop-blur-lg sm:p-6">
          <div className="mb-7 sm:mb-9">
            <BrandLogo variant={brandVariant} />
            {pageName ? (
              <p className="arcade-label mt-4 text-center text-[11px] text-slate-700/80 sm:text-xs">
                — {pageName} —
              </p>
            ) : null}
            {subtitle ? (
              <p className="arcade-label mt-2 text-center text-[10px] tracking-[0.18em] text-slate-900/70 sm:text-xs">
                {subtitle}
              </p>
            ) : null}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
