import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

type TemplateProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showExit?: boolean;
  hideHeading?: boolean;
};

export function Template({ title, subtitle, children, showExit = true, hideHeading = false }: TemplateProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09020d] text-[#fff3dc]">
      <div className="pointer-events-none absolute inset-[-20%] opacity-85 bg-[conic-gradient(from_25deg_at_20%_30%,#ff2975_0deg,#8a2be2_55deg,#00c4ff_120deg,#3bff94_185deg,#ffe066_250deg,#ff7a18_310deg,#ff2975_360deg)]" />
      <div className="pointer-events-none absolute inset-[-20%] opacity-55 mix-blend-screen bg-[radial-gradient(circle_at_18%_22%,rgba(255,120,210,0.55),transparent_35%),radial-gradient(circle_at_82%_18%,rgba(110,208,255,0.45),transparent_38%),radial-gradient(circle_at_20%_82%,rgba(103,255,170,0.38),transparent_40%),radial-gradient(circle_at_78%_78%,rgba(255,225,120,0.45),transparent_38%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(130deg,rgba(255,255,255,0.18)_0px,rgba(255,255,255,0.18)_2px,transparent_2px,transparent_15px)]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-72 w-[60%] -translate-x-1/2 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-fuchsia-500/35 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-cyan-400/30 blur-3xl" />
      </div>

      {showExit ? (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <Link
            to="/"
            className="rounded-md border border-white/50 bg-black/45 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-105 hover:bg-white/20"
          >
            Exit
          </Link>
        </div>
      ) : null}

      <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <div className="rounded-3xl border border-white/25 bg-black/30 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.4)] backdrop-blur-md sm:p-6">
          {!hideHeading ? (
            <div className="mb-7 text-center sm:mb-9">
              <h1 className="mt-2 text-4xl font-black uppercase tracking-[0.08em] text-white [text-shadow:0_0_18px_rgba(255,255,255,0.55)] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.2em] text-white/75 sm:text-sm">
                rot your brain and stimualate it at the same time
              </p>
              {subtitle ? <p className="mt-2 text-sm font-semibold text-white/80 sm:text-base">{subtitle}</p> : null}
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
