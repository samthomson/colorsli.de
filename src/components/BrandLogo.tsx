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
          'brand-arcade-title leading-none text-transparent bg-clip-text',
          isHero ? 'text-[clamp(4.2rem,15vw,11rem)]' : 'text-[clamp(2.8rem,10vw,7.34rem)]',
        )}
      >
        Color Slide
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
