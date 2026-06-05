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
            ? 'flex flex-col items-center leading-[0.9] text-[clamp(3.2rem,min(13vw,16vh),8.5rem)]'
            : 'inline-block whitespace-nowrap leading-[0.95] text-[clamp(2.2rem,6.5vw,4.5rem)]',
        )}
      >
        <span className="block leading-[0.9]">{isHero ? 'Color' : 'Color Slide'}</span>
        <span className={cn('-mt-[0.08em] block leading-[0.9]', isHero ? '' : 'hidden')}>Slide</span>
      </h1>
      <p
        className={cn(
          'brand-arcade-tagline mx-auto mt-3 inline-block rounded-full px-5 py-1.5 font-black uppercase tracking-[0.25em] text-slate-900',
          // Soft white plate that fades to transparent at the edges, so the
          // tagline reads clearly without a hard-edged panel.
          'bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.8)_0%,rgba(255,255,255,0.55)_45%,rgba(255,255,255,0)_78%)]',
          isHero ? 'text-[clamp(0.7rem,min(1.8vw,2.2vh),1.15rem)]' : 'text-[clamp(0.6rem,1.4vw,0.9rem)]',
        )}
      >
        rot your brain and stimulate it at the same time
      </p>
    </div>
  );
}
