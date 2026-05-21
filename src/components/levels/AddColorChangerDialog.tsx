import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Palette, Sparkles, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { ColorPickerPopover } from '@/components/ColorPickerPopover';
import { cn } from '@/lib/utils';
import { COLORS } from '@/lib/colorSlide';
import {
  colorChangerColorAt,
  colorChangerTile,
  DEFAULT_CHANGER_PERIOD_MS,
  MIN_CHANGER_PERIOD_MS,
  type TileKind,
} from '@/lib/tile';

const MAX_CHANGER_PERIOD_MS = 5000;
/** Hard cap on colors per changer — anything past this is noise. */
const MAX_COLORS = 8;

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

type Props = {
  onAdd: (tile: TileKind) => void;
};

/**
 * Builds a "color changer" tile: 2-8 ordered colors that the tile
 * fades through in sync across every instance.
 *
 * UX flow (matches an "in use" toggle pattern):
 *   1. The dialog shows a palette of available colors (presets +
 *      anything the user has added via the picker).
 *   2. Clicking a palette swatch toggles it into / out of the changer.
 *      In-changer swatches get a thick outline ring.
 *   3. The "in changer" list above shows the active colors with
 *      up/down/remove controls for order.
 *   4. The custom color picker adds to the palette only — the user
 *      then toggles it into the changer like any other swatch.
 */
export function AddColorChangerDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<string[]>([COLORS[0], COLORS[1]]);
  const [extras, setExtras] = useState<string[]>([]);
  const [periodMs, setPeriodMs] = useState<number>(DEFAULT_CHANGER_PERIOD_MS);

  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    if (values.length < 2) return;
    let timer: number;
    const tick = () => {
      setNowMs(Date.now());
      const now = Date.now();
      const remaining = periodMs - (now % periodMs);
      timer = window.setTimeout(tick, Math.max(16, remaining));
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [open, values.length, periodMs]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setValues([COLORS[0], COLORS[1]]);
      setExtras([]);
      setPeriodMs(DEFAULT_CHANGER_PERIOD_MS);
    }
    setOpen(next);
  };

  /** Add a user-picked hex to the available palette (NOT to the changer). */
  const addExtra = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!HEX_REGEX.test(v)) return;
    if ((COLORS as readonly string[]).includes(v)) return;
    setExtras((prev) => (prev.includes(v) ? prev : [...prev, v]));
  };

  /** Toggle a palette color in / out of the changer. */
  const toggleInChanger = (hex: string) => {
    const v = hex.toLowerCase();
    setValues((prev) => {
      if (prev.includes(v)) return prev.filter((c) => c !== v);
      if (prev.length >= MAX_COLORS) return prev;
      return [...prev, v];
    });
  };

  const removeFromChanger = (idx: number) => {
    setValues((prev) => prev.filter((_, i) => i !== idx));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setValues((prev) => {
      const next = [...prev];
      const t = idx + dir;
      if (t < 0 || t >= next.length) return prev;
      [next[idx], next[t]] = [next[t], next[idx]];
      return next;
    });
  };

  const canSubmit = values.length >= 2;
  const previewColor = canSubmit
    ? colorChangerColorAt({ type: 'changer', values, periodMs }, nowMs)
    : values[0] ?? '#cccccc';

  const submit = () => {
    if (!canSubmit) return;
    onAdd(colorChangerTile({ values, periodMs }));
    handleOpenChange(false);
  };

  // The full palette = presets union with user extras, preserving
  // insertion order so newly-picked colors appear at the end.
  const paletteHexes = [...COLORS, ...extras];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <label className="inline-flex">
          <ArcadePill asChild tone="rainbow" size="sm">
            <span>
              <ArcadePillIcon tone="rainbow" size="sm">
                <Sparkles className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              Add color changer
            </span>
          </ArcadePill>
        </label>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="brand-arcade-title bg-clip-text text-transparent text-2xl leading-none sm:text-3xl">
            Add color changer
          </DialogTitle>
          <DialogDescription className="arcade-label text-[10px] leading-relaxed tracking-[0.18em] text-slate-600">
            Pick 2-{MAX_COLORS} colors from the palette below. Every
            instance of this tile fades through them in sync.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="h-16 w-16 shrink-0 rounded-full border-2 border-white/60 shadow-inner transition-colors"
              style={{
                backgroundColor: previewColor,
                transitionDuration: `${Math.min(600, Math.floor(periodMs * 0.5))}ms`,
              }}
            />
            <div className="flex-1">
              <p className="arcade-label mb-1 text-[10px] text-slate-500">Preview</p>
              <p className="font-mono text-xs text-slate-700">
                {values.length} color{values.length === 1 ? '' : 's'} · {(periodMs / 1000).toFixed(2)}s each
              </p>
            </div>
          </div>

          <div>
            <p className="arcade-label mb-2 text-[11px] text-slate-600">
              In this changer ({values.length}/{MAX_COLORS})
            </p>
            {values.length === 0 ? (
              <p className="arcade-label rounded-md border border-dashed border-slate-300 px-3 py-3 text-[11px] text-slate-500">
                Click colors below to add them.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {values.map((hex, i) => (
                  <li key={`${hex}-${i}`} className="flex items-center gap-2">
                    <span className="arcade-label w-5 text-right text-[10px] text-slate-400">
                      {i + 1}
                    </span>
                    <span
                      className="h-6 w-6 shrink-0 rounded-full border border-white/60 shadow-sm"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="font-mono text-xs uppercase tracking-wider text-slate-700">
                      {hex}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="h-7 w-7 p-0"
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => move(i, 1)}
                        disabled={i === values.length - 1}
                        className="h-7 w-7 p-0"
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromChanger(i)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                        aria-label="Remove color"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="arcade-label mb-2 text-[11px] text-slate-600">
              Palette — click to toggle in / out
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {paletteHexes.map((hex) => {
                const inUse = values.includes(hex);
                const canAdd = inUse || values.length < MAX_COLORS;
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => toggleInChanger(hex)}
                    disabled={!canAdd}
                    className={cn(
                      'relative h-9 w-9 rounded-full shadow-sm transition-all',
                      inUse
                        ? 'border-[3px] border-slate-900 scale-110 ring-2 ring-white'
                        : 'border border-white/60 hover:scale-110',
                      !canAdd && 'pointer-events-none opacity-40',
                    )}
                    style={{ backgroundColor: hex }}
                    aria-label={`${hex}${inUse ? ' (in changer)' : ''}`}
                    aria-pressed={inUse}
                    title={`${hex}${inUse ? ' — click to remove' : ''}`}
                  />
                );
              })}
              <ColorPickerPopover
                onPick={addExtra}
                trigger={
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-white/60 text-slate-500 transition-transform hover:scale-110 hover:border-slate-900 hover:text-slate-900"
                    aria-label="Add custom color to palette"
                    title="Add custom color to palette"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                }
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="arcade-label text-[11px] text-slate-600">Speed</p>
              <span className="font-mono text-xs text-slate-700">
                {(periodMs / 1000).toFixed(2)}s / color
              </span>
            </div>
            <Slider
              value={[periodMs]}
              min={MIN_CHANGER_PERIOD_MS}
              max={MAX_CHANGER_PERIOD_MS}
              step={50}
              onValueChange={([v]) => setPeriodMs(v)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="arcade-label text-[11px]"
          >
            Cancel
          </Button>
          <ArcadePill
            tone="rainbow"
            size="sm"
            onClick={submit}
            className={cn(!canSubmit && 'pointer-events-none opacity-50')}
          >
            <ArcadePillIcon tone="rainbow" size="sm">
              <Palette className={arcadePillIconSize('sm')} />
            </ArcadePillIcon>
            Add to palette
          </ArcadePill>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
