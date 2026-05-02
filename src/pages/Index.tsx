import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Template } from '@/components/Template';
import { cn } from '@/lib/utils';

const homeLinks = [
  { to: '/practice', label: 'Practice', glow: 'hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] hover:border-cyan-300' },
  { to: '/play', label: 'Play', glow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] hover:border-blue-300' },
  { to: '/high-scores', label: 'High Scores', glow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:border-yellow-300' },
  { to: '/discover', label: 'Discover', glow: 'hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] hover:border-emerald-300' },
  { to: '/create', label: 'Create', glow: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] hover:border-sky-300' },
];

const Index = () => {
  useSeoMeta({
    title: 'Color Slide - Home',
    description: 'Choose how you want to play Color Slide.',
  });

  return (
    <Template showExit={false} brandVariant="hero">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
        {homeLinks.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'w-full rounded-2xl border-2 border-white/70 bg-white/40 px-6 py-5 text-center text-4xl font-black uppercase tracking-[0.12em] text-slate-900 transition-all duration-300 backdrop-blur sm:text-5xl',
              'hover:scale-[1.03] hover:-translate-y-0.5 hover:bg-white/70',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500',
              item.glow,
              index % 2 === 0 ? 'hover:rotate-[0.5deg]' : 'hover:-rotate-[0.5deg]',
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
