import { cn } from '@/lib/utils';

type BrandLogoProps = {
  size?: 'lg' | 'md';
  className?: string;
};

export function BrandLogo({ size = 'md', className }: BrandLogoProps) {
  const isLg = size === 'lg';

  return (
    <div className={cn('text-center', className)}>
      <h1
        className={cn(
          'font-black uppercase tracking-[0.1em] text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-cyan-600 via-50% to-emerald-500 [filter:drop-shadow(0_2px_0_rgba(255,255,255,0.7))_drop-shadow(0_0_22px_rgba(14,116,144,0.35))]',
          isLg ? 'animate-pulse text-6xl sm:text-8xl' : 'text-4xl sm:text-5xl',
        )}
      >
        Color Slide
      </h1>
      <p
        className={cn(
          'mt-2 font-bold uppercase tracking-[0.25em] text-slate-700/90',
          isLg ? 'text-sm sm:text-base' : 'text-[10px] sm:text-xs',
        )}
      >
        rot your brain and stimulate it at the same time
      </p>
    </div>
  );
}
