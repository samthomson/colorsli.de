import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Compact numeric stepper used by the level editor and image-import dialog.
 * Pure +/− buttons + a centered value display, clamped to `[min, max]`.
 */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-md border border-slate-200 px-3 py-2">
      <p className="arcade-label text-[11px] text-slate-500">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="min-w-[2ch] text-center text-base font-bold text-slate-900">
          {value}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
