import { cn } from '@/lib/utils';

type BrandLogoProps = {
  variant?: 'hero' | 'page';
  className?: string;
};

export function BrandLogo({ variant = 'page', className }: BrandLogoProps) {
  const isHero = variant === 'hero';

  return (
    <div className={cn('text-center', className)}>
      <h1
        className={cn(
          'brand-arcade-title text-transparent bg-clip-text',
          isHero
            ? 'flex flex-col items-center leading-[0.9] text-[clamp(4.2rem,15vw,11rem)]'
            : 'inline-block whitespace-nowrap leading-[0.95] text-[clamp(2.2rem,6.5vw,4.8rem)]',
        )}
      >
        <span className="block leading-[0.9]">{isHero ? 'Color' : 'Color Slide'}</span>
        <span className={cn('-mt-[0.08em] block leading-[0.9]', isHero ? '' : 'hidden')}>Slide</span>
      </h1>
      <p
        className={cn(
          'brand-arcade-tagline mt-3 font-black uppercase tracking-[0.25em] text-slate-800/95',
          isHero ? 'text-[clamp(0.9rem,2.1vw,1.35rem)]' : 'text-[clamp(0.6rem,1.4vw,0.9rem)]',
        )}
      >
        rot your brain and stimulate it at the same time
      </p>
    </div>
  );
}
