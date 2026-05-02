import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';
import { CirclesBackground } from '@/components/CirclesBackground';

type TemplateProps = {
  pageName?: string;
  subtitle?: string;
  children: ReactNode;
  showExit?: boolean;
  brandSize?: 'lg' | 'md';
};

export function Template({
  pageName,
  subtitle,
  children,
  showExit = true,
  brandSize = 'md',
}: TemplateProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fff5e6] text-[#2a1050]">
      <CirclesBackground />

      {showExit ? (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <Link
            to="/"
            className="rounded-lg border-2 border-cyan-500/60 bg-white/70 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-cyan-800 shadow-[0_0_15px_rgba(14,116,144,0.22)] backdrop-blur transition-all hover:scale-110 hover:bg-white/90 hover:shadow-[0_0_25px_rgba(14,116,144,0.4)]"
          >
            ← Exit
          </Link>
        </div>
      ) : null}

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border-2 border-white/70 bg-white/35 p-4 shadow-[0_8px_40px_rgba(120,60,200,0.18)] backdrop-blur-lg sm:p-6">
          <div className="mb-7 sm:mb-9">
            <BrandLogo size={brandSize} />
            {pageName ? (
              <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-700/80 sm:text-sm">
                — {pageName} —
              </p>
            ) : null}
            {subtitle ? (
              <p className="mt-2 text-center text-sm font-semibold text-slate-900/70 sm:text-base">
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
