import { useState } from 'react';
import { Library, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { TileSprite } from '@/components/TileSprite';
import { useColorChanger } from '@/hooks/useColorChanger';
import { useTileLibrary } from '@/hooks/useTileLibrary';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';
import { tileBackgroundColor, type TileKind } from '@/lib/tile';

type Props = {
  /** Tile ids already in the current level's palette; library picks for these are no-ops. */
  paletteIds: Set<string>;
  /** Called when the user clicks a library tile. Dialog auto-closes. */
  onPick: (tile: TileKind) => void;
};

/**
 * Emoji-picker-style grid of the user's saved tile events (kind 37284).
 * Each click drops the chosen tile into the level palette. Tiles already
 * present in the palette appear muted so users can see what's reused.
 */
export function TileLibraryDialog({ paletteIds, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUser();
  const library = useTileLibrary();

  const handle = (tile: TileKind) => {
    onPick(tile);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <label className="inline-flex">
          <ArcadePill asChild tone="indigo" size="sm">
            <span>
              <ArcadePillIcon tone="indigo" size="sm">
                <Library className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              Your tile library
            </span>
          </ArcadePill>
        </label>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="brand-arcade-title bg-clip-text text-transparent text-2xl leading-none sm:text-3xl">
            Your tile library
          </DialogTitle>
          <DialogDescription className="arcade-label text-[10px] leading-relaxed tracking-[0.18em] text-slate-600">
            Tiles you've used on previous levels. Click one to add it to
            this level's palette.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <EmptyState
            message="Log in to start saving tiles to your library."
          />
        ) : library.isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="arcade-label text-[11px]">Loading library…</span>
          </div>
        ) : library.data && library.data.length > 0 ? (
          <div className="grid max-h-96 grid-cols-6 gap-2 overflow-y-auto pr-1 sm:grid-cols-8">
            {library.data.map((entry) => (
              <LibrarySwatch
                key={entry.id}
                tile={entry.tile}
                already={paletteIds.has(entry.tile.id)}
                onClick={() => handle(entry.tile)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            message="No saved tiles yet — upload an image or pick an emoji to start your library."
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LibrarySwatch({
  tile,
  already,
  onClick,
}: {
  tile: TileKind;
  already: boolean;
  onClick: () => void;
}) {
  const liveColor = useColorChanger(tile);
  const bg = liveColor ?? tileBackgroundColor(tile);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex aspect-square items-center justify-center overflow-hidden rounded-full border-2 transition-all',
        already
          ? 'border-emerald-400 opacity-60'
          : 'border-slate-200 hover:scale-110 hover:border-slate-900',
      )}
      style={{
        backgroundColor: bg,
        ...(liveColor !== null ? { transition: 'background-color 600ms ease-in-out, transform 200ms, border-color 200ms' } : null),
      }}
      title={tile.label ?? tile.id}
      aria-label={tile.label ?? tile.id}
    >
      <span className="absolute inset-0">
        <TileSprite tile={tile} />
      </span>
      {already && (
        <span className="absolute inset-x-0 bottom-0 bg-emerald-500/80 py-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-white">
          in palette
        </span>
      )}
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="arcade-label text-[11px] text-slate-600">{message}</p>
    </div>
  );
}
