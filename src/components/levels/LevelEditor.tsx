import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eraser, Eye, ImageIcon, ImagePlus, Music2, Save, Sparkles, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { TileSprite } from '@/components/TileSprite';
import { AddEmojiTileDialog } from '@/components/levels/AddEmojiTileDialog';
import { AddLogicTilesDialog } from '@/components/levels/AddLogicTilesDialog';
import { ImageToBoardDialog } from '@/components/levels/ImageToBoardDialog';
import { Stepper } from '@/components/levels/Stepper';
import { TileLibraryDialog } from '@/components/levels/TileLibraryDialog';
import { useToast } from '@/hooks/useToast';
import { useUploadFile } from '@/hooks/useUploadFile';
import { usePublishLevel } from '@/hooks/usePublishLevel';
import { usePublishTile } from '@/hooks/usePublishTile';
import { cn } from '@/lib/utils';
import { COLORS, emptyBoard, validateLevel, type Board } from '@/lib/colorSlide';
import {
  defaultColorTile,
  imageTile,
  matchKeyBoard,
  tileBackgroundColor,
  type TileId,
  type TileKind,
  type TilePalette,
} from '@/lib/tile';
import { extractYouTubeId } from '@/lib/youtube';
import type { ParsedLevel } from '@/lib/levelEvent';

/** Soft warning threshold: with more image cells than this, animated GIFs
 * may noticeably impact frame rate during drag. Doesn't block publish. */
const ANIMATED_PERF_WARN_THRESHOLD = 12;

const MIN_DIM = 4;
const MAX_DIM = 80;
const DEFAULT_DIM = 6;

type LevelEditorProps = {
  /**
   * If provided, the editor opens in *edit mode*: fields are pre-filled
   * from this level, and publishing replaces the level (reuses the d-tag)
   * rather than creating a new one. Author should already be checked by
   * the caller — only the level's author can replace it.
   */
  initial?: ParsedLevel;
};

/**
 * Paint-style level editor — also handles editing an existing level when
 * `initial` is passed.
 *
 * - Adjust rows/cols with +/- steppers.
 * - Pick a tile (or eraser) and click cells to paint.
 * - Live validation panel surfaces blocked cells (4+ runs) and tile counts
 *   that aren't multiples of 4. Publish is disabled until the level is valid.
 *
 * Tile model:
 * - The painting palette is `TileKind[]`. Stage 1 only contains default
 *   color tiles (one per `COLORS` entry plus any non-default hexes baked
 *   into the loaded level / produced by the image dialog).
 * - The board stores tile ids; for default color tiles id === hex string,
 *   so legacy v1 boards are valid as-is.
 * - On publish, the editor passes both the board AND the trimmed tile
 *   palette to `usePublishLevel`. `buildLevelTemplate` strips unused
 *   entries before emitting the kind-37283 event.
 */
export function LevelEditor({ initial }: LevelEditorProps = {}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { publishLevel, isPending } = usePublishLevel();

  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl ?? '');
  const [rows, setRows] = useState(initial?.rows ?? DEFAULT_DIM);
  const [cols, setCols] = useState(initial?.cols ?? DEFAULT_DIM);
  const [board, setBoard] = useState<Board>(
    () => initial?.board ?? emptyBoard(DEFAULT_DIM, DEFAULT_DIM),
  );

  // Palette = the default colors PLUS any extra tiles baked in (from the
  // loaded level, or from the image dialog). Default tiles get a stable
  // identity per hex, so reloading an edit-mode level reuses the same
  // brush slot the level was originally painted with.
  const [extraTiles, setExtraTiles] = useState<TileKind[]>(() => {
    const known = new Set<string>(COLORS);
    const extras = new Map<string, TileKind>();
    if (initial?.tiles) {
      for (const tile of Object.values(initial.tiles)) {
        if (tile.sprite.type === 'color' && known.has(tile.sprite.value)) continue;
        extras.set(tile.id, tile);
      }
    }
    return Array.from(extras.values());
  });

  const palette = useMemo<TileKind[]>(
    () => [...COLORS.map(defaultColorTile), ...extraTiles],
    [extraTiles],
  );

  // Quick lookup by id; used by the canvas, validation panel, and the
  // publish step.
  const tiles = useMemo<TilePalette>(() => {
    const map: TilePalette = {};
    for (const t of palette) map[t.id] = t;
    return map;
  }, [palette]);

  /** Set of palette tile ids — drives the "already in palette" badge in
   * the tile-library picker. */
  const paletteIdSet = useMemo(() => new Set(palette.map((t) => t.id)), [palette]);

  const addPaletteColors = (hexes: string[]) => {
    const known = new Set<string>(COLORS);
    setExtraTiles((prev) => {
      const merged = new Map<string, TileKind>();
      for (const t of prev) merged.set(t.id, t);
      for (const hex of hexes) {
        if (known.has(hex)) continue;
        if (!merged.has(hex)) merged.set(hex, defaultColorTile(hex));
      }
      return Array.from(merged.values());
    });
  };

  const publishTile = usePublishTile();

  /** Adds an arbitrary `TileKind` (image, emoji, special) to the palette
   * if it's not already there, and selects it as the active brush so the
   * user can paint with it immediately.
   *
   * Reusable sprite tiles (image / emoji) also get persisted to the
   * user's library as a kind-37284 event so they can be picked from
   * future levels. Fire-and-forget; library failures land in the
   * pending-events queue and don't block the editor flow. Behavior tiles
   * (treasure / hidden) and pure color tiles are skipped — neither
   * makes sense as a stand-alone library entry.
   */
  const addCustomTile = (tile: TileKind) => {
    setExtraTiles((prev) => {
      if (prev.some((t) => t.id === tile.id)) return prev;
      return [...prev, tile];
    });
    setActiveTile(tile);

    // Only image tiles get library entries. Emojis are universal Unicode
    // — no per-user data, infinite variety at zero cost; the editor's
    // built-in emoji picker is enough. Color tiles are skipped for the
    // same reason. Behavior tiles are level-scoped and never persisted.
    const shouldPersist = !tile.behavior && tile.sprite.type === 'image';
    if (shouldPersist) {
      void publishTile(tile).catch((err) => {
        console.error('tile library publish failed', err);
      });
    }
  };

  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const handleImageUpload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Not an image',
        description: 'Pick a PNG / JPG / GIF / WebP.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const tags = await uploadFile(file);
      const url = tags.find((t) => t[0] === 'url')?.[1];
      const sha256 = tags.find((t) => t[0] === 'x')?.[1];
      if (!url) throw new Error('Upload did not return a URL');
      const tile = imageTile({ url, sha256, alt: file.name });
      addCustomTile(tile);
      toast({
        title: 'Image tile added',
        description: 'Click cells to paint with your new tile.',
      });
    } catch (err) {
      console.error('image upload failed', err);
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const [activeTile, setActiveTile] = useState<TileKind | null>(palette[0] ?? null);
  // The first cell pressed in a stroke determines the action for the whole
  // stroke, so dragging stays consistent:
  //   - 'paint': set every dragged cell to `target` (works for the eraser too,
  //     since target=null means erase)
  //   - 'erase-same': clicking a cell that already matches the brush toggles
  //     it off; only same-id cells encountered during drag are erased.
  type StrokeAction =
    | { mode: 'paint'; target: TileId | null }
    | { mode: 'erase-same'; target: TileId };
  const paintingRef = useRef<StrokeAction | null>(null);

  // Project the board for run-length validation so future hidden tiles
  // (stage 3) can never falsely trip the 4+-in-a-row check at start. Tile
  // count validation runs on the raw board (every tile id, including
  // hidden, must hit multiples of 4).
  const projectedBoard = useMemo(
    () => matchKeyBoard(board, tiles, new Set<string>()),
    [board, tiles],
  );
  const validation = useMemo(
    () => validateLevel(board, projectedBoard),
    [board, projectedBoard],
  );
  const trimmedTitle = title.trim();
  const trimmedYoutube = youtubeUrl.trim();
  const youtubeValid = trimmedYoutube === '' || extractYouTubeId(trimmedYoutube) !== null;
  const canPublish = validation.isValid && trimmedTitle.length > 0 && youtubeValid;

  const resizeBoard = (nextRows: number, nextCols: number) => {
    setRows(nextRows);
    setCols(nextCols);
    setBoard((prev) => {
      const next = emptyBoard(nextRows, nextCols);
      const r = Math.min(prev.length, nextRows);
      for (let i = 0; i < r; i++) {
        const c = Math.min(prev[i].length, nextCols);
        for (let j = 0; j < c; j++) next[i][j] = prev[i][j];
      }
      return next;
    });
  };

  const setCell = (r: number, c: number, value: TileId | null) => {
    setBoard((prev) => {
      if (prev[r][c] === value) return prev;
      const next = prev.map(row => [...row]);
      next[r][c] = value;
      return next;
    });
  };

  const handleCellPress = (r: number, c: number) => {
    const current = board[r][c];
    const targetId = activeTile?.id ?? null;
    if (targetId !== null && current === targetId) {
      paintingRef.current = { mode: 'erase-same', target: targetId };
      setCell(r, c, null);
    } else {
      paintingRef.current = { mode: 'paint', target: targetId };
      setCell(r, c, targetId);
    }
  };
  const handleCellEnter = (r: number, c: number) => {
    const action = paintingRef.current;
    if (!action) return;
    if (action.mode === 'erase-same') {
      if (board[r][c] === action.target) setCell(r, c, null);
    } else {
      setCell(r, c, action.target);
    }
  };
  const endStroke = () => {
    paintingRef.current = null;
  };

  const isBlocked = (r: number, c: number) =>
    validation.blockedCells.some(b => b.row === r && b.col === c);

  // Soft perf warning: many image cells = many simultaneously-animated
  // sprites on every frame. Count the *cells* (not unique tiles) since
  // each image cell renders its own <img>.
  const imageCellCount = useMemo(() => {
    let n = 0;
    for (const row of board) {
      for (const cell of row) {
        if (cell && tiles[cell]?.sprite.type === 'image') n++;
      }
    }
    return n;
  }, [board, tiles]);
  const showImagePerfWarning = imageCellCount > ANIMATED_PERF_WARN_THRESHOLD;

  // Logic-tile bookkeeping: surface a list of all behavior groups
  // currently in the palette, and the set of "orphan" groups that have
  // treasure tiles without any hidden tiles or vice-versa. Orphans are a
  // soft warning rather than a publish blocker — sometimes treasure-only
  // levels make sense (just as scoring chains), and sometimes hidden-only
  // levels are intentional puzzle remix material.
  const { behaviorGroups, orphanWarnings } = useMemo(() => {
    const treasureGroups = new Set<string>();
    const hiddenGroups = new Set<string>();
    for (const t of palette) {
      if (t.behavior?.type === 'treasure') treasureGroups.add(t.behavior.group);
      if (t.behavior?.type === 'hidden') hiddenGroups.add(t.behavior.group);
    }
    const all = Array.from(new Set([...treasureGroups, ...hiddenGroups])).sort();
    const warnings: string[] = [];
    for (const g of treasureGroups) {
      if (!hiddenGroups.has(g)) warnings.push(`Treasure group "${g}" has no hidden tiles to unlock.`);
    }
    for (const g of hiddenGroups) {
      if (!treasureGroups.has(g)) warnings.push(`Hidden group "${g}" has no treasure to unlock it — it will stay locked.`);
    }
    return { behaviorGroups: all, orphanWarnings: warnings };
  }, [palette]);

  const onPublish = async () => {
    if (!canPublish) return;
    try {
      await publishLevel({
        title: trimmedTitle,
        board,
        tiles,
        youtubeUrl: trimmedYoutube || undefined,
        existingDTag: initial?.dTag,
      });
      toast({
        title: isEdit ? 'Level updated' : 'Level published',
        description: isEdit
          ? 'Your changes are live for everyone.'
          : 'Your level is now in Discover.',
      });
      navigate('/discover');
    } catch (err) {
      console.error('Failed to publish level', err);
      toast({
        title: isEdit ? 'Could not update level' : 'Could not publish level',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  // Scales: tiny boards get chunky cells (cap at 48px), huge boards (up to
  // 80 cols) get tiny cells but stay above a minimum so they're still
  // clickable. The 720px budget is roughly the editor card's content width.
  const cellSizePx = Math.max(6, Math.min(48, Math.floor(720 / Math.max(cols, 1))));

  return (
    <Card className="w-full shadow-2xl">
      <CardHeader className="space-y-3">
        <CardTitle className="brand-arcade-title bg-clip-text text-transparent text-3xl leading-none sm:text-4xl">
          {isEdit ? 'Edit Level' : 'Level Editor'}
        </CardTitle>
        <p className="arcade-label text-[10px] tracking-[0.18em] text-muted-foreground">
          {isEdit
            ? 'Update this level. Republishing replaces the previous revision so existing unlocks and leaderboard entries carry over.'
            : 'Paint tiles to design a level. Each tile must appear in multiples of 4, and no row/column may contain 4+ of the same tile in a row. Publish to share with the community.'}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="md:col-span-3">
            <span className="arcade-label mb-1 block text-[11px] text-slate-600">
              Title <span className="text-red-500">*</span>
            </span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={64}
              required
              aria-invalid={trimmedTitle.length === 0}
            />
          </label>

          <label className="md:col-span-3">
            <span className="arcade-label mb-1 flex items-center gap-1.5 text-[11px] text-slate-600">
              <Music2 className="h-3.5 w-3.5" />
              Background music (YouTube URL, optional)
            </span>
            <Input
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://youtu.be/jfKfPfyJRdk"
              aria-invalid={trimmedYoutube !== '' && !youtubeValid}
            />
            {trimmedYoutube !== '' && !youtubeValid && (
              <span className="arcade-label mt-1 block text-[10px] text-red-600">
                Doesn't look like a YouTube link.
              </span>
            )}
          </label>

          <Stepper label="Rows" value={rows} min={MIN_DIM} max={MAX_DIM} onChange={(v) => resizeBoard(v, cols)} />
          <Stepper label="Cols" value={cols} min={MIN_DIM} max={MAX_DIM} onChange={(v) => resizeBoard(rows, v)} />
          <div className="rounded-md border border-dashed border-slate-300 px-3 py-2">
            <p className="arcade-label text-[11px] text-slate-500">Board</p>
            <p className="arcade-label mt-1 text-[10px] text-slate-600">
              {rows} x {cols} ({rows * cols} cells)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <ImageToBoardDialog
            minDim={MIN_DIM}
            maxDim={MAX_DIM}
            onApply={({ rows: r, cols: c, board: nextBoard, palette: nextPalette }) => {
              setRows(r);
              setCols(c);
              setBoard(nextBoard);
              addPaletteColors(nextPalette);
            }}
            trigger={
              <ArcadePill tone="indigo" size="sm">
                <ArcadePillIcon tone="indigo" size="sm">
                  <ImageIcon className={arcadePillIconSize('sm')} />
                </ArcadePillIcon>
                Generate from image
              </ArcadePill>
            }
          />

          <label className={cn('inline-flex', isUploading && 'pointer-events-none opacity-60')}>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                void handleImageUpload(f);
              }}
            />
            <ArcadePill asChild tone="cyan" size="sm">
              <span>
                <ArcadePillIcon tone="cyan" size="sm">
                  {isUploading ? (
                    <Upload className={arcadePillIconSize('sm')} />
                  ) : (
                    <ImagePlus className={arcadePillIconSize('sm')} />
                  )}
                </ArcadePillIcon>
                {isUploading ? 'Uploading...' : 'Add image tile'}
              </span>
            </ArcadePill>
          </label>

          <AddEmojiTileDialog onAdd={addCustomTile} />

          <TileLibraryDialog
            paletteIds={paletteIdSet}
            onPick={addCustomTile}
          />

          <AddLogicTilesDialog
            existingGroups={behaviorGroups}
            onAdd={addCustomTile}
          />
        </div>

        <div>
          <p className="arcade-label mb-2 text-[11px] text-slate-600">Palette</p>
          <div className="flex flex-wrap items-center gap-2">
            {palette.map(tile => {
              const isActive = activeTile?.id === tile.id;
              const behavior = tile.behavior;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => setActiveTile(tile)}
                  className={cn(
                    'relative h-9 w-9 rounded-full border-2 transition-all',
                    isActive
                      ? 'scale-110 border-slate-900 shadow-md'
                      : 'border-white/60 hover:scale-105',
                  )}
                  style={{ backgroundColor: tileBackgroundColor(tile) }}
                  aria-label={tileLabel(tile)}
                  aria-pressed={isActive}
                  title={tileLabel(tile)}
                >
                  <span className="absolute inset-0 overflow-hidden rounded-full">
                    <TileSprite tile={tile} />
                  </span>
                  {behavior?.type === 'treasure' && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-white shadow ring-2 ring-white">
                      <Sparkles className="h-2.5 w-2.5" />
                    </span>
                  )}
                  {behavior?.type === 'hidden' && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow ring-2 ring-white">
                      <Eye className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setActiveTile(null)}
              className={cn(
                'arcade-label flex h-9 items-center gap-1 rounded-full border-2 px-3 text-[10px] transition-all',
                activeTile === null
                  ? 'scale-110 border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-300 text-slate-600 hover:scale-105',
              )}
              aria-pressed={activeTile === null}
            >
              <Eraser className="h-4 w-4" />
              Erase
            </button>
          </div>
        </div>

        {validation.blockedCells.length > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            <span className="text-lg font-bold">!</span>
            <p className="arcade-label text-[11px]">
              4+ in a row detected — max run on a starting board is 3 (4-runs auto-clear, 5+ runs are blocked).
            </p>
          </div>
        )}

        {showImagePerfWarning && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            <span className="text-base font-bold">!</span>
            <p className="arcade-label text-[11px] leading-relaxed">
              Heads up: this level has {imageCellCount} image tile cells.
              Animated images may drop the frame rate during drag on slower
              devices — still publishable, just FYI.
            </p>
          </div>
        )}

        {orphanWarnings.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
            <span className="text-base font-bold">!</span>
            <ul className="arcade-label space-y-0.5 text-[11px] leading-relaxed">
              {orphanWarnings.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto,1fr]">
          <div
            className="select-none rounded-xl bg-slate-100/70 p-2"
            onMouseUp={endStroke}
            onMouseLeave={endStroke}
            onTouchEnd={endStroke}
          >
            <div
              className="grid gap-[3px]"
              style={{ gridTemplateColumns: `repeat(${cols}, ${cellSizePx}px)` }}
            >
              {board.flatMap((row, r) =>
                row.map((cellId, c) => {
                  const blocked = isBlocked(r, c);
                  const tile = cellId ? tiles[cellId] ?? null : null;
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleCellPress(r, c); }}
                      onMouseEnter={() => handleCellEnter(r, c)}
                      onTouchStart={(e) => { e.preventDefault(); handleCellPress(r, c); }}
                      className={cn(
                        'relative rounded-full border-2 border-transparent transition-all overflow-hidden',
                        cellId ? '' : 'border-dashed border-slate-300 bg-transparent',
                        blocked && 'ring-2 ring-red-500 ring-offset-1 animate-pulse',
                      )}
                      style={{
                        width: cellSizePx,
                        height: cellSizePx,
                        backgroundColor: tileBackgroundColor(tile),
                      }}
                      aria-label={`Cell ${r + 1}-${c + 1}${cellId ? '' : ' (empty)'}${blocked ? ' (part of a 4+ run)' : ''}`}
                    >
                      <TileSprite tile={tile} />
                      {blocked && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                          !
                        </span>
                      )}
                    </button>
                  );
                }),
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
              <p className="arcade-label mb-2 text-[11px] text-slate-600">Validation</p>
              {Object.keys(validation.colorCounts).length === 0 ? (
                <p className="arcade-label text-[11px] text-slate-500">
                  Paint some cells to begin.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {Object.entries(validation.colorCounts).map(([id, count]) => {
                    const tile = tiles[id];
                    const ok = count % 4 === 0;
                    return (
                      <li key={id} className="flex items-center gap-2">
                        <span
                          className="relative inline-block h-4 w-4 overflow-hidden rounded-full border border-white/50"
                          style={{ backgroundColor: tileBackgroundColor(tile ?? null) }}
                        >
                          <TileSprite tile={tile ?? null} />
                        </span>
                        <span className="font-mono text-xs">{tileLabel(tile)}</span>
                        <span className={cn('arcade-label ml-auto text-[10px]', ok ? 'text-emerald-600' : 'text-red-600')}>
                          {count} {ok ? 'ok' : `(need +${4 - (count % 4)})`}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Footer CTA: validation hint on the left, big arcade publish on
            the right. Disabled state keeps the button visible but mutes
            interaction so layout doesn't jump as the form becomes valid. */}
        <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:items-center">
          <p
            className={cn(
              'arcade-label text-[10px] text-slate-500',
              canPublish && 'invisible',
            )}
          >
            {trimmedTitle.length === 0
              ? `Add a title to ${isEdit ? 'update' : 'publish'}.`
              : !youtubeValid
                ? `Fix the YouTube URL to ${isEdit ? 'update' : 'publish'}.`
                : `Fix validation errors to enable ${isEdit ? 'updating' : 'publishing'}.`}
          </p>
          <ArcadePill
            tone="emerald"
            size="lg"
            onClick={onPublish}
            className={cn(
              'self-end',
              (!canPublish || isPending) && 'pointer-events-none opacity-50',
            )}
          >
            <ArcadePillIcon tone="emerald" size="lg">
              <Save className={arcadePillIconSize('lg')} />
            </ArcadePillIcon>
            {isPending
              ? (isEdit ? 'Updating...' : 'Publishing...')
              : (isEdit ? 'Update level' : 'Publish level')}
          </ArcadePill>
        </div>
      </CardContent>
    </Card>
  );
}

/** Short human-readable label for a tile (used in aria-labels, tooltips,
 * and the validation panel). */
function tileLabel(tile: TileKind | undefined): string {
  if (!tile) return 'Empty';
  if (tile.label) return tile.label;
  if (tile.sprite.type === 'color') return tile.sprite.value;
  if (tile.sprite.type === 'image') return tile.sprite.alt ?? 'Image tile';
  return 'Emoji tile';
}
