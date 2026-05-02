# Colour Slide

A puzzle game where you slide rows and columns to match exactly 4 colors in a row. Built with React, TypeScript, and TailwindCSS.

![Colour Slide Game](https://shakespeare.diy/badge.svg)

## 🎮 How to Play

1. **Drag to slide**: Click and drag any colored circle
   - Drag **horizontally** to slide the entire row left/right
   - Drag **vertically** to slide the entire column up/down
2. **Match 4 in a row**: Line up exactly 4 of the same color horizontally or vertically
3. **Clear the board**: Match all colors to win!

## 🎯 Game Rules (Hard Constraints)

These rules are enforced in the code and MUST be maintained:

### 1. **Every color appears in exact multiples of 4**
- The board generation ensures each unique color appears exactly N×4 times
- This guarantees the game is always winnable
- Validated in `createRandomBoard()` via `validateColorCounts()`

### 2. **Only exactly 4 in a row clears**
- 5+ colors in a row will NOT clear (shows red warning)
- You must break them apart to create valid groups of 4
- Checked in `checkMatches()` which validates boundaries

### 3. **No 4+ in a row at game start**
- Initial board must have max 3 consecutive colors
- Board generation loops until this is satisfied
- Validated via `hasAnyFourInARow()` function

### 4. **Matches only evaluated on drag release**
- Colors don't clear while dragging
- Match detection happens in `handleMouseUp()` via `shouldCheckMatches` flag
- Blocked cells (5+) still show warning in real-time

## 🏗️ Project Structure

```
src/
├── components/
│   ├── ColourSlideGame.tsx      # Main game component
│   ├── ui/                      # shadcn/ui components
│   └── ...
├── pages/
│   └── Index.tsx                # Home page
├── hooks/                       # Custom React hooks
├── lib/                         # Utility functions
└── contexts/                    # React contexts
```

## 🎨 Key Components

### `ColourSlideGame.tsx`

The main game component containing:

#### Core Functions

- **`createRandomBoard(size)`**: Generates a valid initial board
  - Calculates color distribution (multiples of 4)
  - Handles leftover cells (pre-cleared for non-divisible-by-4 grids)
  - Shuffles until no 4+ sequences exist
  - Validates color counts remain correct

- **`checkMatches(board)`**: Detects valid 4-in-a-row groups
  - Only matches EXACT groups of 4 (not 5+)
  - Checks horizontal and vertical
  - Prevents overlapping matches

- **`checkBlocked(board)`**: Finds 5+ sequences (invalid)
  - Returns cells that are part of 5+ consecutive colors
  - Used for red warning rings

- **`hasAnyFourInARow(board)`**: Initial board validation
  - Returns true if any 4+ sequence exists
  - Used during board generation

#### State Management

- `board`: 2D array of colors (or null for cleared)
- `dragging`: Current drag state (type, index, offsets)
- `matching`: Cells currently being cleared (animation)
- `blocked`: Cells in invalid 5+ sequences
- `shouldCheckMatches`: Flag to trigger match evaluation

#### Drag System

- `handleMouseDown()`: Initiates drag with undecided direction
- `handleMouseMove()`: 
  - Detects horizontal vs vertical movement
  - Updates visual offset in real-time
  - Snaps to next position at 70% threshold
  - Updates board state on snap
- `handleMouseUp()`: Triggers match evaluation

## 🎲 Grid Sizes

Supports any grid size from 5×5 to 12×12:

- **Divisible by 4** (6×6, 8×8, 10×10, 12×12): All cells are colored
- **Not divisible by 4** (5×5, 7×7, 9×9, 11×11): Leftover cells pre-cleared
  - Example: 5×5 = 25 cells = 24 colored + 1 cleared
  - Example: 7×7 = 49 cells = 48 colored + 1 cleared

Colors scale with grid size:
- Small grids (≤4 groups): 2 colors
- Medium grids (≤16 groups): 3-4 colors  
- Large grids (≤25 groups): 5 colors
- Extra large (>25 groups): 6 colors

## 🎨 Color Palette

8 predefined colors from TailwindCSS:
```typescript
const COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];
```

## 🔧 Technical Details

### Dependencies

- **React 19**: Modern React with hooks
- **TypeScript**: Type-safe development
- **TailwindCSS 4**: Utility-first styling
- **shadcn/ui**: Accessible component primitives
- **Vite**: Fast build tool

### Key Features

- **Tactile drag feedback**: CSS transforms for smooth 60fps dragging
- **Sticky snapping**: 70% threshold before cells shift
- **Touch support**: Works on mobile devices
- **Visual indicators**:
  - Purple ring: Horizontal drag
  - Blue ring: Vertical drag
  - Red pulsing ring: Invalid 5+ sequence
  - Green pulse: Matching cells about to clear
- **Move counter**: Track puzzle efficiency
- **Win detection**: Trophy icon on completion

## 🚀 Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## 🐛 Debugging

The game includes validation logging:

- Color count validation errors appear in console
- Board generation warnings after 100 failed attempts
- All validation happens client-side

## 📝 Future Ideas

- Undo/redo functionality
- Timer mode
- Minimum move challenges
- Saved game states
- Color themes
- Sound effects
- Animations for sliding (not just snapping)

## 🤝 Contributing

When modifying the game, ensure you maintain the **hard rules**:

1. ✅ Run color count validation after any board generation changes
2. ✅ Test that 5+ sequences show warnings (not clear)
3. ✅ Verify initial boards never have 4+ in a row
4. ✅ Confirm matches only trigger on mouse up

## 📄 License

MIT

---

**Built with [Shakespeare](https://shakespeare.diy)** - AI-powered web development
