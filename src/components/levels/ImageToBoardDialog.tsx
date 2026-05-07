import { useCallback, useMemo, useState } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ArcadePill, ArcadePillIcon, arcadePillIconSize } from '@/components/ArcadePill';
import { Stepper } from '@/components/levels/Stepper';
import { cn } from '@/lib/utils';
import { emptyBoard, type Board, type Color } from '@/lib/colorSlide';

type Props = {
  /** Inclusive min for size / rows / cols. */
  minDim: number;
  /** Inclusive max for size / rows / cols. */
  maxDim: number;
  /** Trigger element rendered inside `<DialogTrigger asChild>`. */
  trigger: React.ReactNode;
  /**
   * Called when the user confirms. The editor should replace its rows, cols,
   * and board with these values, and merge `palette` into its active painting
   * palette so the user can keep editing with the same colors.
   */
  onApply: (next: {
    rows: number;
    cols: number;
    board: Board;
    palette: string[];
  }) => void;
};

const MIN_COLORS = 2;
const MAX_COLORS = 16;
const DEFAULT_COLORS = 6;
const DEFAULT_SIZE_PREFERENCE = 16;

/**
 * "Generate from image" modal for the level editor.
 *
 * Pipeline (all guarantees baked into the output board):
 *
 * 1. **Palette extraction** — pixel-bucket the image (4 bits/channel), then
 *    pick `n` colors via *farthest-first traversal* seeded by the most
 *    populous bucket. Each subsequent pick maximises its minimum distance to
 *    already-picked colors, so as the user drags the Colors slider from 2→16
 *    they get genuinely different colors, not progressively-closer shades.
 *
 * 2. **Cell quantization with run-length cap** — draw the image into a
 *    `cols × rows` canvas with smoothing on (browser does the
 *    down-sampling/blur), scan cells in raster order, and at each cell pick
 *    the closest palette color that wouldn't extend a same-color run to 4 in
 *    either the current row or column. Allowed max run is 3.
 *
 * 3. **Count balancing** — every color count must be a multiple of 4 for the
 *    level to be publishable. After step 2, we null the worst-matching cells
 *    of each color so its remaining count is `count - (count % 4)` (or 0 if
 *    `count < 4`). Nulling can only *shorten* runs, so the run-length
 *    invariant from step 2 is preserved.
 *
 * Result: a starting board that always satisfies the editor's
 * `validateLevel` rules (no 4+ runs, every color count `%4 == 0`).
 */
export function ImageToBoardDialog({ minDim, maxDim, trigger, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  // The decoded <img> element (set in onLoad). Held as state so derived
  // useMemos can depend on it without reading a ref during render.
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  const defaultSize = Math.min(DEFAULT_SIZE_PREFERENCE, maxDim);

  // Rows + cols are independent; the Size slider is a convenience that
  // writes to both. Users can then nudge each individually with the
  // steppers underneath to make rectangular boards.
  const [rows, setRows] = useState(defaultSize);
  const [cols, setCols] = useState(defaultSize);
  const [colorCount, setColorCount] = useState(DEFAULT_COLORS);

  // A board with N cells can hold at most floor(N/4) colors that satisfy
  // the multiples-of-4 rule (each viable color needs ≥4 cells). Cap the
  // Colors slider's max accordingly so the user can't pick a setting that's
  // mathematically impossible to validate.
  const maxAllowedColors = Math.max(
    MIN_COLORS,
    Math.min(MAX_COLORS, Math.floor((rows * cols) / 4)),
  );
  const effectiveColorCount = Math.min(colorCount, maxAllowedColors);

  // Reset everything when the dialog closes so the next open starts fresh.
  // Doing it in the close handler (rather than an effect) avoids the
  // setState-in-effect cascade.
  const resetState = useCallback(() => {
    setImgSrc(null);
    setImgEl(null);
    setRows(defaultSize);
    setCols(defaultSize);
    setColorCount(DEFAULT_COLORS);
  }, [defaultSize]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState();
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Clear the old decoded element while the new one loads so any derived
      // memos collapse to their empty state until <img onLoad> fires again.
      setImgEl(null);
      setImgSrc(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  // Palette extraction reruns whenever the decoded image or color count
  // changes. Pure useMemo over real values — no refs touched here.
  const palette = useMemo<string[]>(() => {
    if (!imgEl) return [];
    return extractPalette(imgEl, effectiveColorCount);
  }, [imgEl, effectiveColorCount]);

  // Board regenerates whenever the palette OR dimensions change.
  const board = useMemo<Board>(() => {
    if (!imgEl || palette.length === 0) {
      return emptyBoard(rows, cols);
    }
    return boardFromImage(imgEl, rows, cols, palette);
  }, [imgEl, palette, rows, cols]);

  const handleApply = () => {
    if (!imgEl || palette.length === 0) return;
    onApply({ rows, cols, board, palette });
    handleOpenChange(false);
  };

  // The Size slider drives the *longer* dimension and scales the shorter to
  // preserve the current aspect ratio. So if the image came in landscape and
  // dragged rows/cols to (16, 11), bumping size to 24 gives (24, 17) — not
  // (24, 24). To make a square board, the user nudges either stepper until
  // rows == cols (then size moves both in lock).
  const handleSizeChange = (newLonger: number) => {
    const longer = Math.max(rows, cols);
    const shorter = Math.min(rows, cols);
    const ratio = longer === 0 ? 1 : shorter / longer;
    const newShorter = Math.max(
      minDim,
      Math.min(maxDim, Math.round(newLonger * ratio)),
    );
    if (rows >= cols) {
      setRows(newLonger);
      setCols(newShorter);
    } else {
      setCols(newLonger);
      setRows(newShorter);
    }
  };

  // When a new image finishes decoding, default the board to the image's
  // own aspect ratio (so a wide painting becomes a wide board, not square).
  // The user can still override per-axis afterwards via the steppers.
  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgEl(img);
    const dims = aspectToBoardDims(
      img.naturalWidth,
      img.naturalHeight,
      defaultSize,
      minDim,
      maxDim,
    );
    setRows(dims.rows);
    setCols(dims.cols);
  };

  // The preview pane is up to ~620px wide on desktop; figure out a cell
  // size that fills it without overflowing. Use the larger dimension so
  // we never exceed the box.
  const cellPx = Math.max(4, Math.floor(620 / Math.max(rows, cols)));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[95vh] w-[95vw] !max-w-[1400px] overflow-y-auto sm:!max-w-[1400px]">
        <DialogHeader>
          <DialogTitle className="brand-arcade-title bg-clip-text text-transparent text-2xl leading-none sm:text-3xl">
            Generate from image
          </DialogTitle>
          <DialogDescription className="arcade-label text-[10px] tracking-[0.18em] text-slate-600">
            Pick a photo. We extract its most distinct colors, snap each grid
            cell to the closest one, and balance the counts so the result is
            already publishable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Drop zone / file picker */}
          <label
            className={cn(
              'group flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50/50 px-6 py-8 transition-colors hover:border-cyan-500 hover:bg-cyan-50',
              imgSrc && 'py-4',
            )}
          >
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Upload className="h-5 w-5 text-cyan-700" />
            <span className="arcade-label text-[11px] text-cyan-900">
              {imgSrc ? 'Pick a different image' : 'Click to choose an image'}
            </span>
          </label>

          {imgSrc && (
            <>
              {/* Hidden image element does the actual decode; we capture
                  the loaded element via setState so derived memos can react
                  to it. */}
              <img
                key={imgSrc}
                src={imgSrc}
                onLoad={handleImgLoad}
                className="hidden"
                alt=""
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="arcade-label text-[11px] text-slate-600">Source</p>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <img
                      src={imgSrc}
                      alt="Source preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="arcade-label text-[11px] text-slate-600">Preview</p>
                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <BoardPreview board={board} cellPx={cellPx} />
                  </div>
                </div>
              </div>

              {palette.length > 0 && (
                <div className="space-y-2">
                  <p className="arcade-label text-[11px] text-slate-600">
                    Extracted palette ({palette.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {palette.map((c) => (
                      <span
                        key={c}
                        className="h-7 w-7 rounded-full border-2 border-white/70 shadow-sm"
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DimSlider
                  label={`Size (${rows} × ${cols})`}
                  value={Math.max(rows, cols)}
                  min={minDim}
                  max={maxDim}
                  onChange={handleSizeChange}
                />
                <DimSlider
                  label={
                    colorCount > maxAllowedColors
                      ? `Colors (capped at ${maxAllowedColors} for this board size)`
                      : 'Colors'
                  }
                  value={effectiveColorCount}
                  min={MIN_COLORS}
                  max={maxAllowedColors}
                  onChange={setColorCount}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Stepper
                  label="Rows"
                  value={rows}
                  min={minDim}
                  max={maxDim}
                  onChange={setRows}
                />
                <Stepper
                  label="Cols"
                  value={cols}
                  min={minDim}
                  max={maxDim}
                  onChange={setCols}
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="arcade-label text-[11px]"
            >
              Cancel
            </Button>
            <ArcadePill
              tone="cyan"
              size="sm"
              onClick={handleApply}
              className={cn(
                (!imgEl || palette.length === 0) && 'pointer-events-none opacity-50',
              )}
            >
              <ArcadePillIcon tone="cyan" size="sm">
                <ImageIcon className={arcadePillIconSize('sm')} />
              </ArcadePillIcon>
              Use this board
            </ArcadePill>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DimSlider({
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
    <div className="space-y-2 rounded-md border border-slate-200 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="arcade-label text-[11px] text-slate-600">{label}</span>
        <span className="arcade-label text-[11px] text-slate-900">{value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}

function BoardPreview({ board, cellPx }: { board: Board; cellPx: number }) {
  const cols = board[0]?.length ?? 0;
  return (
    <div
      className="grid gap-[2px]"
      style={{ gridTemplateColumns: `repeat(${cols}, ${cellPx}px)` }}
    >
      {board.flatMap((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            className={cn(
              'rounded-full',
              cell ? '' : 'border border-dashed border-slate-300',
            )}
            style={{
              width: cellPx,
              height: cellPx,
              backgroundColor: cell ?? 'transparent',
            }}
          />
        )),
      )}
    </div>
  );
}

// ---------- pure helpers ----------

const SAMPLE_DIM = 128;
/** Bits per channel for the bucketing pre-pass. 5 bits = 32 levels per channel
 * = up to 32k unique buckets. This is fine enough that perceptually distinct
 * shades stay in separate buckets, but coarse enough to absorb sensor noise
 * and JPEG artefacts. */
const BUCKET_BITS = 5;
/** Max candidates passed to farthest-first. Sorting by frequency desc then
 * truncating filters single-pixel anti-aliasing outliers without dropping
 * any genuinely-present color cluster. */
const MAX_CANDIDATE_POOL = 512;

/**
 * Extract `n` representative colors from `img` via **pure farthest-first
 * traversal in CIE Lab color space**.
 *
 * Why Lab instead of RGB: RGB Euclidean distance does NOT match human
 * perception. Two "dark navy" shades can be RGB-far but visually identical;
 * Lab is engineered so that distance ≈ perceived difference. Picking spread
 * in Lab therefore picks spread that the *eye* notices.
 *
 * Why pure farthest-first instead of k-means: k-means optimises *coverage*
 * (clusters land where the pixels are dense), so an image with lots of blues
 * + a sliver of gold will spend cluster budget on multiple blues before
 * reaching the gold. The user wants the opposite — *diversity*. Farthest
 * first picks the dominant color first, then at every step adds the
 * remaining candidate that's MAXIMUM-FAR from anything already picked. So
 * the slider goes "next pick = most different from what you have", which is
 * what we want for a paintable palette.
 *
 * No weight bias in the selection score either (a `× sqrt(weight)` term I
 * tried earlier just brought back the "lots of blues" problem). The
 * candidate POOL is filtered by frequency (anti-noise) but the *selection*
 * within the pool is purely about Lab spread.
 */
function extractPalette(img: HTMLImageElement, n: number): string[] {
  if (n <= 0) return [];

  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_DIM;
  canvas.height = SAMPLE_DIM;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, SAMPLE_DIM, SAMPLE_DIM);
  const data = ctx.getImageData(0, 0, SAMPLE_DIM, SAMPLE_DIM).data;

  // Bucket pixels at BUCKET_BITS per channel and accumulate the *mean* RGB
  // per bucket (so the candidate color is the actual average, not an
  // arbitrary bucket-corner). Skip transparent pixels.
  type Bucket = {
    rSum: number;
    gSum: number;
    bSum: number;
    count: number;
  };
  const shift = 8 - BUCKET_BITS;
  const buckets = new Map<number, Bucket>();
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a < 128) continue;
    const key =
      ((r >> shift) << (BUCKET_BITS * 2)) |
      ((g >> shift) << BUCKET_BITS) |
      (b >> shift);
    const existing = buckets.get(key);
    if (existing) {
      existing.rSum += r;
      existing.gSum += g;
      existing.bSum += b;
      existing.count += 1;
    } else {
      buckets.set(key, { rSum: r, gSum: g, bSum: b, count: 1 });
    }
  }

  if (buckets.size === 0) return [];

  type Candidate = {
    rgb: [number, number, number];
    lab: [number, number, number];
    count: number;
  };
  const allCandidates: Candidate[] = [...buckets.values()].map((b) => {
    const r = b.rSum / b.count;
    const g = b.gSum / b.count;
    const bl = b.bSum / b.count;
    return {
      rgb: [r, g, bl],
      lab: srgbToLab(r, g, bl),
      count: b.count,
    };
  });

  // Sort by frequency desc, take top pool. Outliers (single-pixel
  // anti-aliased fringes etc.) sit at the tail and never get considered.
  allCandidates.sort((a, b) => b.count - a.count);
  const pool = allCandidates.slice(0, MAX_CANDIDATE_POOL);

  if (pool.length <= n) {
    // Image genuinely has fewer distinct colors than requested — return
    // them all rather than padding with duplicates.
    return pool.map((c) => rgbToHex(c.rgb));
  }

  // Pure farthest-first traversal in Lab. Seed with the most-populous
  // candidate (= the dominant color of the image, a reasonable starting
  // point). Subsequent picks maximize their MIN Lab distance to anything
  // already picked — guaranteeing maximum perceptual spread.
  const picked: Candidate[] = [pool[0]];
  // Maintain "current min distance to picked" per pool entry so we don't
  // recompute from scratch each iteration.
  const minDistSquared = pool.map((c) =>
    c === pool[0] ? -1 : labDistSquared(c.lab, pool[0].lab),
  );

  while (picked.length < n) {
    let bestIdx = -1;
    let bestDist = -1;
    for (let i = 0; i < pool.length; i++) {
      if (minDistSquared[i] < 0) continue; // already picked
      if (minDistSquared[i] > bestDist) {
        bestDist = minDistSquared[i];
        bestIdx = i;
      }
    }
    if (bestIdx === -1) break;
    const newCentre = pool[bestIdx];
    picked.push(newCentre);
    // Mark picked + update min distances for the rest.
    minDistSquared[bestIdx] = -1;
    for (let i = 0; i < pool.length; i++) {
      if (minDistSquared[i] < 0) continue;
      const d = labDistSquared(pool[i].lab, newCentre.lab);
      if (d < minDistSquared[i]) minDistSquared[i] = d;
    }
  }

  return picked.map((c) => rgbToHex(c.rgb));
}

/**
 * Quantize `img` into a `rows × cols` board against the provided `palette`,
 * guaranteeing both:
 *   - no run of 4+ same-color cells in any row or column, AND
 *   - every color's count is a multiple of 4 (or 0).
 *
 * See the file header for the full pipeline rationale.
 */
function boardFromImage(
  img: HTMLImageElement,
  rows: number,
  cols: number,
  palette: string[],
): Board {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return emptyBoard(rows, cols);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // "Cover" fit: scale the source rect so its aspect matches the destination
  // (cols x rows) and center-crop the rest. This guarantees every cell is
  // filled with image data instead of letterboxing.
  const srcAspect = img.naturalWidth / img.naturalHeight;
  const dstAspect = cols / rows;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (srcAspect > dstAspect) {
    sw = img.naturalHeight * dstAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / dstAspect;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
  const data = ctx.getImageData(0, 0, cols, rows).data;

  // Convert palette to Lab so quantization uses the same perceptual metric
  // the palette extraction did.
  const paletteLab = palette.map((hex) => {
    const [r, g, b] = hexToRgb(hex);
    return srgbToLab(r, g, b);
  });
  const board: Board = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null as Color),
  );

  // Per-cell original Lab — used both during run-length-aware quantization
  // (to score candidate palette colors) and during the post-step where we
  // null the *worst-matching* cells of any over-count color.
  const cellLab: Array<[number, number, number]> = new Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = (r * cols + c) * 4;
      cellLab[r * cols + c] = srgbToLab(data[i], data[i + 1], data[i + 2]);
    }
  }

  const wouldMakeFourInARow = (r: number, c: number, color: string): boolean => {
    let rowRun = 1;
    for (let cc = c - 1; cc >= 0 && board[r][cc] === color; cc--) rowRun++;
    if (rowRun >= 4) return true;
    let colRun = 1;
    for (let rr = r - 1; rr >= 0 && board[rr][c] === color; rr--) colRun++;
    return colRun >= 4;
  };

  // ----- step 1: greedy quantization with run-length cap of 3 -----
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lab = cellLab[r * cols + c];
      const order = paletteLab
        .map((p, idx) => ({ idx, dist: labDistSquared(lab, p) }))
        .sort((a, b) => a.dist - b.dist);

      let chosenIdx = order[0].idx;
      for (const { idx } of order) {
        if (!wouldMakeFourInARow(r, c, palette[idx])) {
          chosenIdx = idx;
          break;
        }
      }
      board[r][c] = palette[chosenIdx];
    }
  }

  // ----- step 2: balance color counts to multiples of 4 -----
  // Group the cells of each color, sort by "worst match" (largest Lab
  // distance from cell to its assigned color), and null the surplus.
  // Nulling can only shorten existing runs, so the run-length invariant
  // from step 1 is preserved.
  type AssignedCell = { r: number; c: number; dist: number };
  const cellsByColor = new Map<string, AssignedCell[]>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const color = board[r][c];
      if (!color) continue;
      const pIdx = palette.indexOf(color);
      const dist =
        pIdx === -1 ? 0 : labDistSquared(cellLab[r * cols + c], paletteLab[pIdx]);
      const list = cellsByColor.get(color);
      if (list) list.push({ r, c, dist });
      else cellsByColor.set(color, [{ r, c, dist }]);
    }
  }

  for (const cells of cellsByColor.values()) {
    const count = cells.length;
    const surplus = count < 4 ? count : count % 4;
    if (surplus === 0) continue;
    // Worst-matching cells go first, so the visible image stays as close as
    // possible to the source.
    cells.sort((a, b) => b.dist - a.dist);
    for (let i = 0; i < surplus; i++) {
      const { r, c } = cells[i];
      board[r][c] = null;
    }
  }

  return board;
}

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace('#', '');
  return [
    parseInt(s.slice(0, 2), 16),
    parseInt(s.slice(2, 4), 16),
    parseInt(s.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const toHex = (n: number) => clamp255(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function labDistSquared(
  a: [number, number, number],
  b: [number, number, number],
): number {
  const dl = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return dl * dl + da * da + db * db;
}

// ---------- sRGB ↔ CIE Lab (D65, sRGB linearization) ----------

const LAB_EPSILON = 0.008856; // (6/29)^3
const LAB_KAPPA = 7.787;

function srgbChannelToLinear(c: number): number {
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function srgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lr = srgbChannelToLinear(r);
  const lg = srgbChannelToLinear(g);
  const lb = srgbChannelToLinear(b);

  // Linear sRGB → XYZ (D65 reference white)
  const x = (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) / 0.95047;
  const y = (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) / 1.0;
  const z = (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) / 1.08883;

  const fx = x > LAB_EPSILON ? Math.cbrt(x) : LAB_KAPPA * x + 16 / 116;
  const fy = y > LAB_EPSILON ? Math.cbrt(y) : LAB_KAPPA * y + 16 / 116;
  const fz = z > LAB_EPSILON ? Math.cbrt(z) : LAB_KAPPA * z + 16 / 116;

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Map an image's pixel aspect ratio to (rows, cols) for the board, with
 * `longerDim` becoming the board's longer side. Both axes are clamped to
 * `[minDim, maxDim]`. Square images return (longerDim, longerDim).
 */
function aspectToBoardDims(
  imgW: number,
  imgH: number,
  longerDim: number,
  minDim: number,
  maxDim: number,
): { rows: number; cols: number } {
  if (imgW <= 0 || imgH <= 0) {
    return { rows: longerDim, cols: longerDim };
  }
  const aspect = imgW / imgH; // > 1 = landscape, < 1 = portrait
  let rows: number;
  let cols: number;
  if (aspect >= 1) {
    cols = longerDim;
    rows = Math.max(1, Math.round(longerDim / aspect));
  } else {
    rows = longerDim;
    cols = Math.max(1, Math.round(longerDim * aspect));
  }
  rows = Math.max(minDim, Math.min(maxDim, rows));
  cols = Math.max(minDim, Math.min(maxDim, cols));
  return { rows, cols };
}
