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
  children: ReactNode;
  showExit?: boolean;
  brandVariant?: 'hero' | 'page';
};

export function Template({
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

        {/* The game wordmark lives in the otherwise-empty center of the header
            on content pages (hero/home shows the big wordmark in the body). */}
        {!isHero ? (
          <Link
            to="/"
            aria-label="Color Slide home"
            className="absolute left-1/2 top-2 hidden -translate-x-1/2 sm:top-3 md:block"
          >
            <span className="brand-arcade-title inline-block whitespace-nowrap bg-clip-text text-3xl leading-none text-transparent sm:text-4xl lg:text-5xl">
              Color Slide
            </span>
          </Link>
        ) : null}

        <div className="flex items-center gap-2">
          <MusicToggle unmuted={musicUnmuted} onChange={setMusicUnmuted} />
          <PendingEventsBadge />
          <LoginArea className="max-w-60" />
        </div>
      </header>

      {/* Hero (home): content floats directly on the bubble background, with
          only a tight brand plate. Content pages: everything sits on a
          frosted panel so text + controls stay legible over the busy
          background. */}
      <main
        className={cn(
          'relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pb-8 pt-4 sm:px-6 sm:pt-6',
          isHero && 'justify-center gap-6 sm:gap-8',
        )}
      >
        {isHero ? (
          <>
            <div className="w-fit max-w-full px-2 py-1 text-center sm:px-4">
              <BrandLogo variant={brandVariant} />
            </div>
            <div className="w-full">{children}</div>
          </>
        ) : (
          <>
            {/* Content pages: title sits in the header center; the content
                area is just the page's own surfaces (cards / pills). */}
            <div className="w-full">{children}</div>
          </>
        )}
      </main>
    </div>
  );
}
