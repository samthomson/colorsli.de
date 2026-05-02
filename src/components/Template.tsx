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
    <div className="relative min-h-screen overflow-hidden bg-[#fff5e6] text-[#2a1050]">
      <CirclesBackground />

      {showExit ? (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <Link
            to="/"
            className="rounded-lg border-2 border-pink-500/60 bg-white/70 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-pink-700 shadow-[0_0_15px_rgba(236,72,153,0.25)] backdrop-blur transition-all hover:scale-110 hover:bg-white/90 hover:shadow-[0_0_25px_rgba(236,72,153,0.45)]"
          >
            ← Exit
          </Link>
        </div>
      ) : null}

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border-2 border-white/70 bg-white/35 p-4 shadow-[0_8px_40px_rgba(120,60,200,0.18)] backdrop-blur-lg sm:p-6">
          {!hideHeading ? (
            <div className="mb-7 text-center sm:mb-9">
              <h1 className="mt-2 text-4xl font-black uppercase tracking-[0.08em] text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-fuchsia-500 to-cyan-500 [filter:drop-shadow(0_2px_0_rgba(255,255,255,0.7))] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.25em] text-purple-700/90 sm:text-sm">
                rot your brain and stimulate it at the same time
              </p>
              {subtitle ? <p className="mt-2 text-sm font-semibold text-purple-900/70 sm:text-base">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
