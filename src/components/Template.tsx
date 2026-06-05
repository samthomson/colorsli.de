import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { BrandLogo } from '@/components/BrandLogo';
import { CirclesBackground } from '@/components/CirclesBackground';
import { PendingEventsBadge } from '@/components/PendingEventsBadge';
import { MusicToggle } from '@/components/levels/MusicToggle';
import { LoginArea } from '@/components/auth/LoginArea';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { cn } from '@/lib/utils';

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
  const [musicUnmuted, setMusicUnmuted] = useLocalStorage<boolean>(
    'colorslide:music-unmuted',
    true,
  );

  const isHero = brandVariant === 'hero';

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
          <MusicToggle unmuted={musicUnmuted} onChange={setMusicUnmuted} />
          <PendingEventsBadge />
          <LoginArea className="max-w-60" />
        </div>
      </header>

      {/* Content floats directly over the bubble background. Only the brand
          block sits on a frosted plate, sized to hug the wordmark so the
          background stays visible around it. Hero pages (home) vertically
          center so the whole menu lands above the fold. */}
      <main
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-8 pt-4 sm:px-6 sm:pt-6',
          isHero && 'justify-center gap-6 sm:gap-8',
        )}
      >
        <div className="w-fit max-w-full px-2 py-1 text-center sm:px-4">
          <BrandLogo variant={brandVariant} />
          {pageName ? (
            <p className="arcade-label text-haloed mt-3 text-center text-[11px] text-slate-800 sm:text-xs">
              — {pageName} —
            </p>
          ) : null}
          {subtitle ? (
            <p className="arcade-label text-haloed mt-2 text-center text-[10px] tracking-[0.18em] text-slate-900 sm:text-xs">
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className={cn('w-full', !isHero && 'mt-6 sm:mt-8')}>{children}</div>
      </main>
    </div>
  );
}
