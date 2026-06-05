import { forwardRef, type ButtonHTMLAttributes, type PointerEvent, type ReactNode } from 'react';
import { Slot } from 'radix-ui';
import { cn } from '@/lib/utils';
import { playClick } from '@/lib/sfx';

/**
 * Reusable arcade-styled pill button.
 *
 * Shared visual identity: chunky white border, layered shadow (offset block +
 * neon glow), Bungee typography from the `arcade-pill` CSS class, and an
 * optional `arcade-pill-bob` rocking animation. Each tone provides its own
 * gradient + glow color so different actions can express different vibes.
 *
 * Use `asChild` to wrap a Link, DropdownMenuTrigger, etc:
 *
 * ```tsx
 * <ArcadePill asChild tone="cyan" size="sm">
 *   <Link to="/">Home</Link>
 * </ArcadePill>
 * ```
 */

type ToneStyle = {
  /** Background gradient + base text color. */
  surface: string;
  /** Composite shadow: offset block underneath + neon glow. */
  shadow: string;
  /** Hover state: lifts the offset and brightens the glow. */
  hoverShadow: string;
  /** Active/pressed: collapses the offset, dampens the glow. */
  activeShadow: string;
  /** Color/background classes for the inner icon-circle helper. */
  iconCircle: string;
};

const TONE_STYLES = {
  cyan: {
    surface: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 text-white',
    shadow:
      'shadow-[0_4px_0_rgba(15,23,42,0.45),0_0_22px_rgba(34,211,238,0.55)]',
    hoverShadow:
      'hover:shadow-[0_5px_0_rgba(15,23,42,0.5),0_0_34px_rgba(34,211,238,0.85)]',
    activeShadow:
      'active:shadow-[0_2px_0_rgba(15,23,42,0.45),0_0_18px_rgba(34,211,238,0.65)]',
    iconCircle: 'bg-white/95 text-blue-700',
  },
  amber: {
    surface: 'bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white',
    shadow:
      'shadow-[0_4px_0_rgba(124,45,18,0.5),0_0_22px_rgba(251,146,60,0.6)]',
    hoverShadow:
      'hover:shadow-[0_5px_0_rgba(124,45,18,0.55),0_0_34px_rgba(251,146,60,0.9)]',
    activeShadow:
      'active:shadow-[0_2px_0_rgba(124,45,18,0.5),0_0_18px_rgba(251,146,60,0.7)]',
    iconCircle: 'bg-white/95 text-orange-700',
  },
  emerald: {
    surface:
      'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 text-white',
    shadow:
      'shadow-[0_4px_0_rgba(6,78,59,0.5),0_0_22px_rgba(52,211,153,0.6)]',
    hoverShadow:
      'hover:shadow-[0_5px_0_rgba(6,78,59,0.55),0_0_34px_rgba(52,211,153,0.9)]',
    activeShadow:
      'active:shadow-[0_2px_0_rgba(6,78,59,0.5),0_0_18px_rgba(52,211,153,0.7)]',
    iconCircle: 'bg-white/95 text-emerald-700',
  },
  slate: {
    surface:
      'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 text-white',
    shadow:
      'shadow-[0_4px_0_rgba(15,23,42,0.45),0_0_18px_rgba(148,163,184,0.5)]',
    hoverShadow:
      'hover:shadow-[0_5px_0_rgba(15,23,42,0.5),0_0_28px_rgba(148,163,184,0.7)]',
    activeShadow:
      'active:shadow-[0_2px_0_rgba(15,23,42,0.45),0_0_15px_rgba(148,163,184,0.6)]',
    iconCircle: 'bg-white/95 text-slate-700',
  },
  red: {
    surface: 'bg-gradient-to-br from-red-500 via-rose-500 to-orange-500 text-white',
    shadow:
      'shadow-[0_4px_0_rgba(127,29,29,0.5),0_0_22px_rgba(239,68,68,0.55)]',
    hoverShadow:
      'hover:shadow-[0_5px_0_rgba(127,29,29,0.55),0_0_34px_rgba(239,68,68,0.85)]',
    activeShadow:
      'active:shadow-[0_2px_0_rgba(127,29,29,0.5),0_0_18px_rgba(239,68,68,0.65)]',
    iconCircle: 'bg-white/95 text-red-700',
  },
  indigo: {
    surface: 'bg-gradient-to-br from-sky-500 via-indigo-600 to-blue-800 text-white',
    shadow:
      'shadow-[0_4px_0_rgba(30,27,75,0.55),0_0_22px_rgba(99,102,241,0.6)]',
    hoverShadow:
      'hover:shadow-[0_5px_0_rgba(30,27,75,0.6),0_0_34px_rgba(99,102,241,0.9)]',
    activeShadow:
      'active:shadow-[0_2px_0_rgba(30,27,75,0.55),0_0_18px_rgba(99,102,241,0.7)]',
    iconCircle: 'bg-white/95 text-indigo-700',
  },
  rainbow: {
    surface:
      'text-white [background-image:linear-gradient(105deg,#ef4444_0%,#f97316_18%,#facc15_34%,#22c55e_50%,#22d3ee_66%,#3b82f6_82%,#ef4444_100%)] [background-size:220%_220%]',
    shadow:
      'shadow-[0_6px_0_rgba(15,23,42,0.5),0_0_30px_rgba(251,146,60,0.55),0_0_60px_rgba(34,211,238,0.45)]',
    hoverShadow:
      'hover:shadow-[0_8px_0_rgba(15,23,42,0.55),0_0_44px_rgba(251,146,60,0.8),0_0_80px_rgba(34,211,238,0.65)]',
    activeShadow:
      'active:shadow-[0_3px_0_rgba(15,23,42,0.5),0_0_22px_rgba(251,146,60,0.65),0_0_45px_rgba(34,211,238,0.55)]',
    iconCircle: 'bg-white/95 text-slate-800',
  },
} as const satisfies Record<string, ToneStyle>;

type SizeStyle = {
  /** Pill chrome: padding, text size, border thickness, gap between children. */
  pill: string;
  /** Inner icon circle wrapper. */
  iconCircle: string;
  /** SVG sizing for the icon. */
  iconSvg: string;
};

const SIZE_STYLES = {
  sm: {
    pill: 'gap-2 border-[3px] px-3 py-1.5 text-[11px] sm:text-xs',
    iconCircle: 'h-6 w-6 sm:h-7 sm:w-7',
    iconSvg: 'h-3.5 w-3.5 sm:h-4 sm:w-4',
  },
  md: {
    pill: 'gap-2.5 border-[3px] px-4 py-2 text-xs sm:text-sm',
    iconCircle: 'h-8 w-8',
    iconSvg: 'h-4 w-4',
  },
  lg: {
    pill: 'gap-3 border-4 px-6 py-3 text-base sm:text-lg',
    iconCircle: 'h-10 w-10',
    iconSvg: 'h-5 w-5',
  },
  xl: {
    pill: 'gap-4 border-4 px-10 py-5 text-2xl sm:text-4xl sm:border-[6px]',
    iconCircle: 'h-14 w-14 sm:h-16 sm:w-16',
    iconSvg: 'h-7 w-7 sm:h-8 sm:w-8',
  },
  '2xl': {
    pill: 'gap-5 border-4 px-12 py-6 text-3xl sm:text-5xl sm:border-[6px]',
    iconCircle: 'h-16 w-16 sm:h-20 sm:w-20',
    iconSvg: 'h-8 w-8 sm:h-10 sm:w-10',
  },
} as const satisfies Record<string, SizeStyle>;

export type ArcadePillTone = keyof typeof TONE_STYLES;
export type ArcadePillSize = keyof typeof SIZE_STYLES;

export type ArcadePillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ArcadePillTone;
  size?: ArcadePillSize;
  /** Apply the gentle bob animation. Default true. */
  bob?: boolean;
  /**
   * Full-width / block layout. When true the pill stretches to fill its
   * container (good for stacked menu items) and uses a more subtle hover
   * lift instead of the default scale+rotate (which looks twitchy on a
   * very wide button).
   */
  block?: boolean;
  /** When true, render as a Slot so the child element receives the styling. */
  asChild?: boolean;
};

export const ArcadePill = forwardRef<HTMLButtonElement, ArcadePillProps>(
  function ArcadePill(
    { tone = 'cyan', size = 'sm', bob = true, block = false, asChild = false, className, onPointerDown, ...rest },
    ref,
  ) {
    const Comp = asChild ? Slot.Root : 'button';
    const t = TONE_STYLES[tone];
    const s = SIZE_STYLES[size];

    // Tactile click feedback on press (snappier than waiting for click), then
    // forward any caller-supplied handler. Respects the global sfx toggle.
    const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
      playClick();
      onPointerDown?.(e);
    };

    return (
      <Comp
        ref={ref}
        onPointerDown={handlePointerDown}
        className={cn(
          'arcade-pill group items-center justify-center rounded-full border-white/85 transition-all active:translate-y-0.5 disabled:pointer-events-none disabled:opacity-60',
          block
            ? 'flex w-full hover:-translate-y-0.5 hover:scale-[1.02]'
            : 'inline-flex hover:scale-110 hover:-rotate-2',
          t.surface,
          t.shadow,
          t.hoverShadow,
          t.activeShadow,
          s.pill,
          bob && !block && 'arcade-pill-bob',
          className,
        )}
        {...rest}
      />
    );
  },
);

/** Inner circular badge — typically wraps a lucide icon at the start of a pill. */
export function ArcadePillIcon({
  tone = 'cyan',
  size = 'sm',
  children,
  className,
}: {
  tone?: ArcadePillTone;
  size?: ArcadePillSize;
  children: ReactNode;
  className?: string;
}) {
  const t = TONE_STYLES[tone];
  const s = SIZE_STYLES[size];
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full shadow-inner transition-transform group-hover:-translate-x-0.5',
        t.iconCircle,
        s.iconCircle,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Sizing helper for raw icons inside a pill (without the circular wrapper). */
export function arcadePillIconSize(size: ArcadePillSize = 'sm'): string {
  return SIZE_STYLES[size].iconSvg;
}
