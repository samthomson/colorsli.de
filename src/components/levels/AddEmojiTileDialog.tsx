import { useState } from 'react';
import { Smile } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { cn } from '@/lib/utils';
import { emojiTile, type TileKind } from '@/lib/tile';

/**
 * Small curated picker for adding an emoji tile to a level. Users can
 * also type / paste any emoji into the input — the grid is just a
 * convenience for the common case. Submitting an already-present emoji
 * is harmless (`addCustomTile` dedupes on id in the editor).
 */

const CATEGORIES: { name: string; emojis: string[] }[] = [
  {
    name: 'Smileys',
    emojis: ['😀', '😎', '🤩', '🥳', '🤯', '😴', '😭', '😡', '🤔', '🤖', '👻', '💀'],
  },
  {
    name: 'Hearts & symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '⭐', '✨', '🔥', '⚡', '💎', '🎯'],
  },
  {
    name: 'Nature',
    emojis: ['🌞', '🌙', '⛅', '🌈', '🌊', '🌸', '🌻', '🌵', '🍀', '🌲', '🍄', '🌍'],
  },
  {
    name: 'Food',
    emojis: ['🍎', '🍌', '🍇', '🍓', '🥑', '🍕', '🍔', '🍟', '🍩', '🍪', '🍰', '☕'],
  },
  {
    name: 'Animals',
    emojis: ['🐶', '🐱', '🦊', '🐼', '🦁', '🐯', '🐸', '🐙', '🐳', '🦄', '🦋', '🐝'],
  },
  {
    name: 'Activities',
    emojis: ['⚽', '🏀', '🎮', '🎲', '🎵', '🎨', '🚀', '🛸', '⛵', '🏆', '🎁', '💡'],
  },
];

type Props = {
  /** Called once with the new emoji tile. The editor wires this to
   * `addCustomTile`, which also handles "already in palette" dedupe. */
  onAdd: (tile: TileKind) => void;
};

export function AddEmojiTileDialog({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (next) setValue('');
    setOpen(next);
  };

  const pick = (glyph: string) => {
    setValue(glyph);
  };

  const submit = (glyph: string) => {
    const trimmed = glyph.trim();
    if (!trimmed) return;
    onAdd(emojiTile({ value: trimmed }));
    handleOpenChange(false);
  };

  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <label className="inline-flex">
          <ArcadePill asChild tone="amber" size="sm">
            <span>
              <ArcadePillIcon tone="amber" size="sm">
                <Smile className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              Add emoji tile
            </span>
          </ArcadePill>
        </label>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="brand-arcade-title bg-clip-text text-transparent text-2xl leading-none sm:text-3xl">
            Add emoji tile
          </DialogTitle>
          <DialogDescription className="arcade-label text-[10px] leading-relaxed tracking-[0.18em] text-slate-600">
            Pick from the grid below or type / paste any emoji.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <label className="block">
            <span className="arcade-label mb-1 block text-[11px] text-slate-600">
              Emoji
            </span>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="🌟"
              maxLength={16}
              className="text-2xl"
              autoFocus
            />
          </label>

          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {CATEGORIES.map((cat) => (
              <div key={cat.name}>
                <p className="arcade-label mb-1 text-[10px] tracking-[0.18em] text-slate-500">
                  {cat.name}
                </p>
                <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                  {cat.emojis.map((glyph) => (
                    <button
                      key={`${cat.name}:${glyph}`}
                      type="button"
                      onClick={() => pick(glyph)}
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-md border border-transparent text-2xl transition-all hover:scale-110 hover:border-slate-300 hover:bg-slate-100',
                        trimmed === glyph && 'border-slate-900 bg-slate-100',
                      )}
                      aria-label={glyph}
                      title={glyph}
                    >
                      {glyph}
                    </button>
                  ))}
                </div>
              </div>
            ))}
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
            tone="amber"
            size="sm"
            onClick={() => submit(trimmed)}
            className={cn(!canSubmit && 'pointer-events-none opacity-50')}
          >
            <ArcadePillIcon tone="amber" size="sm">
              <Smile className={arcadePillIconSize('sm')} />
            </ArcadePillIcon>
            Add to palette
          </ArcadePill>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
