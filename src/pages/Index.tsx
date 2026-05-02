import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Template } from '@/components/Template';
import { cn } from '@/lib/utils';

const homeLinks = [
  { to: '/practice', label: 'Practice', glow: 'hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:border-cyan-300' },
  { to: '/play', label: 'Play', glow: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.5)] hover:border-pink-300' },
  { to: '/high-scores', label: 'High Scores', glow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:border-yellow-300' },
  { to: '/discover', label: 'Discover', glow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:border-emerald-300' },
  { to: '/create', label: 'Create', glow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:border-purple-300' },
];

const Index = () => {
  useSeoMeta({
    title: 'Color Slide - Home',
    description: 'Choose how you want to play Color Slide.',
  });

  return (
    <Template title="Color Slide" subtitle="Select a mode." showExit={false} hideHeading>
      <section className="mx-auto flex min-h-[62vh] max-w-4xl flex-col items-center justify-center gap-5 py-6 text-center sm:gap-6">
        <h1 className="animate-pulse text-6xl font-black uppercase tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-fuchsia-500 via-50% to-cyan-500 sm:text-8xl [filter:drop-shadow(0_2px_0_rgba(255,255,255,0.8))_drop-shadow(0_0_25px_rgba(236,72,153,0.4))]">
          Color Slide
        </h1>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-purple-700/90 sm:text-base">
          rot your brain and stimulate it at the same time
        </p>
        <div className="mt-2 flex w-full flex-col gap-3 sm:gap-4">
          {homeLinks.map((item, index) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'w-full rounded-2xl border-2 border-white/70 bg-white/40 px-6 py-5 text-4xl font-black uppercase tracking-[0.12em] text-purple-900 transition-all duration-300 backdrop-blur sm:text-5xl',
                'hover:scale-[1.03] hover:-translate-y-0.5 hover:bg-white/70',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500',
                item.glow,
                index % 2 === 0 ? 'hover:rotate-[0.5deg]' : 'hover:-rotate-[0.5deg]',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </Template>
  );
};

export default Index;
