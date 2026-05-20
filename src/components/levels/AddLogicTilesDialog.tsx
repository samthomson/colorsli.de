import { useId, useMemo, useState } from 'react';
import { Eye, Sparkles } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { cn } from '@/lib/utils';
import type { TileBehavior, TileKind } from '@/lib/tile';

const TREASURE_DEFAULT_COLOR = '#facc15';
const HIDDEN_DEFAULT_COLOR = '#7c3aed';

type Props = {
  /** Group names that already exist in the palette, used to default the
   * group input and to autocomplete via a `<datalist>`. */
  existingGroups: string[];
  /** Called once per tile to add. Treasure (if checked) is added first so
   * the editor's palette ordering reads "treasure → hidden". */
  onAdd: (tile: TileKind) => void;
};

/**
 * One-shot modal for adding a treasure + hidden pair. Treasure and hidden
 * tiles only make sense together (a treasure with no hidden unlocks
 * nothing; a hidden with no treasure stays locked), so the UI defaults to
 * adding both. Per-side checkboxes are still there for the edge cases.
 *
 * Group name is pre-populated with a sensible default ("set-1" or
 * incremented if it collides with an existing group), so the submit
 * button is enabled the moment the dialog opens — no surprise disabled
 * state from an empty field.
 */
export function AddLogicTilesDialog({ existingGroups, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState('');
  const [treasureEnabled, setTreasureEnabled] = useState(true);
  const [hiddenEnabled, setHiddenEnabled] = useState(true);
  const [treasureColor, setTreasureColor] = useState(TREASURE_DEFAULT_COLOR);
  const [hiddenColor, setHiddenColor] = useState(HIDDEN_DEFAULT_COLOR);
  const datalistId = useId();

  const nextDefaultGroup = useMemo(() => suggestGroupName(existingGroups), [existingGroups]);

  // Reset to fresh defaults on every open. Doing it inside onOpenChange
  // (not an effect) avoids the setState-in-effect lint cascade.
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setGroup(nextDefaultGroup);
      setTreasureEnabled(true);
      setHiddenEnabled(true);
      setTreasureColor(TREASURE_DEFAULT_COLOR);
      setHiddenColor(HIDDEN_DEFAULT_COLOR);
    }
    setOpen(next);
  };

  const trimmedGroup = group.trim();
  const canSubmit = trimmedGroup.length > 0 && (treasureEnabled || hiddenEnabled);

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (treasureEnabled) onAdd(makeTile('treasure', trimmedGroup, treasureColor));
    if (hiddenEnabled) onAdd(makeTile('hidden', trimmedGroup, hiddenColor));
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <label className="inline-flex">
          <ArcadePill asChild tone="amber" size="sm">
            <span>
              <ArcadePillIcon tone="amber" size="sm">
                <Sparkles className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              Add logic tiles
            </span>
          </ArcadePill>
        </label>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="brand-arcade-title bg-clip-text text-transparent text-2xl leading-none sm:text-3xl">
            Add logic tiles
          </DialogTitle>
          <DialogDescription className="arcade-label text-[10px] leading-relaxed tracking-[0.18em] text-slate-600">
            Logic tiles come in pairs sharing a group name. Treasure tiles
            unlock the matching hidden tiles when you clear 4 of them.
            Untick one side if you only want a treasure or only a hidden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <label className="block">
            <span className="arcade-label mb-1 block text-[11px] text-slate-600">
              Group <span className="text-red-500">*</span>
            </span>
            <Input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              list={datalistId}
              aria-invalid={trimmedGroup.length === 0}
              autoFocus
            />
            <datalist id={datalistId}>
              {existingGroups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <span className="arcade-label mt-1 block text-[10px] text-slate-500">
              Type a short identifier the two tiles share — e.g. "gold" or "set-1".
            </span>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SidePanel
              kind="treasure"
              icon={Sparkles}
              title="Treasure"
              hint="Clear 4 of these to unlock the hidden tiles."
              enabled={treasureEnabled}
              onEnabledChange={setTreasureEnabled}
              color={treasureColor}
              onColorChange={setTreasureColor}
            />
            <SidePanel
              kind="hidden"
              icon={Eye}
              title="Hidden"
              hint="Shows as ? until the treasure unlocks it."
              enabled={hiddenEnabled}
              onEnabledChange={setHiddenEnabled}
              color={hiddenColor}
              onColorChange={setHiddenColor}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} className="arcade-label text-[11px]">
            Cancel
          </Button>
          <ArcadePill
            tone="amber"
            size="sm"
            onClick={handleSubmit}
            className={cn(!canSubmit && 'pointer-events-none opacity-50')}
          >
            <ArcadePillIcon tone="amber" size="sm">
              <Sparkles className={arcadePillIconSize('sm')} />
            </ArcadePillIcon>
            Add to palette
          </ArcadePill>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SidePanel({
  kind,
  icon: Icon,
  title,
  hint,
  enabled,
  onEnabledChange,
  color,
  onColorChange,
}: {
  kind: 'treasure' | 'hidden';
  icon: typeof Sparkles;
  title: string;
  hint: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  color: string;
  onColorChange: (next: string) => void;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        'rounded-lg border p-3 transition-opacity',
        enabled ? 'border-slate-200 bg-white/70' : 'border-dashed border-slate-200 bg-slate-50 opacity-60',
      )}
    >
      <label htmlFor={id} className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={enabled}
          onCheckedChange={(v) => onEnabledChange(v === true)}
        />
        <Icon
          className={cn(
            'h-4 w-4',
            kind === 'treasure' ? 'text-amber-500' : 'text-indigo-500',
          )}
        />
        <span className="arcade-label text-[11px] text-slate-800">{title}</span>
      </label>
      <p className="arcade-label mt-2 text-[10px] leading-snug text-slate-500">
        {hint}
      </p>
      <label className="mt-3 flex items-center gap-2">
        <span className="arcade-label text-[10px] text-slate-600">Color</span>
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          disabled={!enabled}
          className="h-7 w-10 cursor-pointer rounded border border-slate-300 disabled:cursor-not-allowed"
          aria-label={`${title} tile color`}
        />
        <span className="font-mono text-[10px] text-slate-500">{color}</span>
      </label>
    </div>
  );
}

function makeTile(kind: 'treasure' | 'hidden', group: string, color: string): TileKind {
  const behavior: TileBehavior = { type: kind, group };
  return {
    id: `${kind}:${group}:${randomSlug()}`,
    sprite: { type: 'color', value: color },
    behavior,
    label: `${kind === 'treasure' ? 'Treasure' : 'Hidden'} · ${group}`,
  };
}

/** Pick "set-1", or "set-2", ... — the first numbered suffix not already
 * present. Falls back to the first existing group when one is available
 * so the most common "extend an existing pair" workflow Just Works. */
function suggestGroupName(existing: string[]): string {
  if (existing.length > 0) return existing[0];
  const taken = new Set(existing);
  for (let i = 1; i < 1000; i++) {
    const candidate = `set-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return 'set-1';
}

function randomSlug(): string {
  const bytes = new Uint8Array(4);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
