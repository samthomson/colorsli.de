import { useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

type Props = {
  /** Called once with a normalized lowercase `#rrggbb` when the user confirms. */
  onPick: (hex: string) => void;
  /** Initial color shown in the picker. Defaults to a neutral mid-purple. */
  initial?: string;
  /** Custom trigger element. Defaults to a small dashed swatch with a + icon. */
  trigger?: React.ReactNode;
  /** Disable interaction (renders the trigger muted). */
  disabled?: boolean;
};

/**
 * Hue/saturation color picker in a popover, with a synced hex input.
 * Drops a normalized `#rrggbb` on the consumer when the user clicks
 * "Use color". Used by both the level editor (add a custom color tile
 * to the palette) and the color-changer dialog (add a color to the changer).
 */
export function ColorPickerPopover({ onPick, initial = '#a855f7', trigger, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(initial);
  const [hex, setHex] = useState(initial);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setColor(initial);
      setHex(initial);
    }
    setOpen(next);
  };

  const onPickerChange = (next: string) => {
    setColor(next);
    setHex(next);
  };

  const onHexInput = (raw: string) => {
    const v = raw.trim();
    setHex(v);
    if (HEX_REGEX.test(v)) setColor(v.toLowerCase());
  };

  const isValid = HEX_REGEX.test(hex);
  const confirm = () => {
    if (!isValid) return;
    onPick(hex.toLowerCase());
    setOpen(false);
  };

  const defaultTrigger = (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-white/60 text-slate-500 transition-all hover:scale-105 hover:border-slate-900 hover:text-slate-900',
        disabled && 'pointer-events-none opacity-50',
      )}
      aria-label="Add custom color"
      title="Add custom color"
    >
      <Plus className="h-4 w-4" />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger ?? defaultTrigger}</PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="flex flex-col gap-3">
          <HexColorPicker color={color} onChange={onPickerChange} />
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-8 w-8 shrink-0 rounded-full border-2 border-white/70 shadow-sm"
              style={{ backgroundColor: isValid ? color : '#ccc' }}
            />
            <Input
              value={hex}
              onChange={(e) => onHexInput(e.target.value)}
              placeholder="#a855f7"
              maxLength={7}
              className={cn(
                'h-8 font-mono text-sm',
                !isValid && hex !== '' && 'border-red-300 focus-visible:ring-red-500',
              )}
            />
            <Button
              type="button"
              onClick={confirm}
              disabled={!isValid}
              size="sm"
              className="arcade-label text-[11px]"
            >
              Use
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
