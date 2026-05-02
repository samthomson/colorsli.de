import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Template } from '@/components/Template';
import { cn } from '@/lib/utils';

const homeLinks = [
  { to: '/play', label: 'Play' },
  { to: '/practice', label: 'Practice' },
  { to: '/high-scores', label: 'High Scores' },
  { to: '/discover', label: 'Discover' },
  { to: '/create', label: 'Create' },
];

const Index = () => {
  useSeoMeta({
    title: 'Color Slide - Home',
    description: 'Choose how you want to play Color Slide.',
  });

  return (
    <Template title="Color Slide" subtitle="Select a mode." showExit={false} hideHeading>
      <section className="mx-auto flex min-h-[62vh] max-w-4xl flex-col items-center justify-center gap-4 py-4 text-center sm:gap-5">
        <h1 className="text-6xl font-black uppercase tracking-[0.1em] text-white [text-shadow:0_0_26px_rgba(255,255,255,0.75)] sm:text-8xl">
          Color Slide
        </h1>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80 sm:text-sm">
          rot your brain and stimulate it at the same time
        </p>
        {homeLinks.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'w-full rounded-2xl border border-white/35 bg-black/25 px-6 py-5 text-4xl font-black uppercase tracking-[0.12em] text-white transition-all duration-200 [text-shadow:0_0_18px_rgba(255,255,255,0.45)]',
              'hover:scale-[1.03] hover:-translate-y-0.5 hover:border-white hover:bg-white/22 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.55),0_0_35px_rgba(255,255,255,0.55)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90',
              index % 2 === 0
                ? 'hover:rotate-1 hover:[text-shadow:0_0_20px_rgba(255,140,222,0.9)]'
                : 'hover:-rotate-1 hover:[text-shadow:0_0_20px_rgba(110,225,255,0.9)]',
              index === 2 && 'hover:[text-shadow:0_0_22px_rgba(255,230,120,0.95)]'
            )}
          >
            {item.label}
          </Link>
        ))}
      </section>
    </Template>
  );
};

export default Index;
