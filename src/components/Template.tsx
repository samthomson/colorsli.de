import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CirclesBackground } from '@/components/CirclesBackground';

type TemplateProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showExit?: boolean;
  hideHeading?: boolean;
};

export function Template({ title, subtitle, children, showExit = true, hideHeading = false }: TemplateProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0221] text-white">
      <CirclesBackground />

      {showExit ? (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <Link
            to="/"
            className="rounded-lg border-2 border-pink-400/60 bg-pink-500/20 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-pink-100 shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all hover:scale-110 hover:bg-pink-500/40 hover:shadow-[0_0_25px_rgba(236,72,153,0.6)]"
          >
            ← Exit
          </Link>
        </div>
      ) : null}

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border-2 border-white/20 bg-black/50 p-4 shadow-[0_0_40px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-lg sm:p-6">
          {!hideHeading ? (
            <div className="mb-7 text-center sm:mb-9">
              <h1 className="mt-2 text-4xl font-black uppercase tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-300 to-cyan-300 sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-purple-300/90 sm:text-sm">
                rot your brain and stimulate it at the same time
              </p>
              {subtitle ? <p className="mt-2 text-sm font-semibold text-white/70 sm:text-base">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
