# Color Slide

A puzzle game where you slide rows and columns to match exactly 4 colors in a row. Built with React, TypeScript, and TailwindCSS.

![Color Slide Game](https://shakespeare.diy/badge.svg)

## 🎮 How to Play

1. **Drag to slide**: Click and drag any colored circle
   - Drag **horizontally** to slide the entire row left/right
   - Drag **vertically** to slide the entire column up/down
2. **Match 4 in a row**: Line up exactly 4 of the same color horizontally or vertically
3. **Clear the board**: Match all colors to win!

## 🎯 Game Rules (Hard Constraints)

These rules are enforced in the code and MUST be maintained:

- Every non-empty color count must be divisible by 4.
- Only exact runs of 4 clear.
- Fresh boards must start with no run of 4+.
- Match clearing only happens on drag release.

## 🏗️ Project Structure

```text
src/
├── components/
│   ├── ...                      # Main game component
│   ├── ui/                      # shadcn/ui components
│   └── ...
├── pages/
│   └── Index.tsx                # Home page
├── hooks/                       # Custom React hooks
├── lib/                         # Utility functions
└── contexts/                    # React contexts
```

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

## 📄 License

whatever. it's open source.

---

**Built with [Shakespeare](https://shakespeare.diy)** - AI-powered web development

## ✅ TODO

verify:
- [ ] browse others levels
- [ ] publish score / level completion

- [ ] level ideas
  - [ ] 60s; color changing
  - [ ] moving boards
  - [ ] hokusai views of fuji
  - [ ] kubricks; hal 9000, overlooked carpet, twins
  - [ ] nostrich / zaps
  - [ ] yee haw / yee yaw; rotating in 3d puzzle plane, maybe not rotating but flipping 180 degrees up down, or left right every x seconds
  - [ ] kusama
  - [ ] tibetan theme

special tiles / levels:
- [ ] eyes, which reveal other colors, until which they can't be cleared
- [ ] color changing
- [ ] custom circles (tiles?); ie set your own things (images? colors? emojis?)
- [ ] some kind of shuffling dynamic (where either on an interval piece swap/reshuffle or in response to shuffle types being cleared)

features:
- [ ] share a level
- [ ] espy color picker
- [ ] Add color themes
- [ ] Add sound effects
- [ ] nice effects on teh circles, including when bursting, and noises. can they be 3d actually?
- [ ] dm, private levels
- [ ] scoring
- [ ] zap a level author

- [ ] multilingual
- [ ] fork/edit, delete your own levels
- [ ] emotional support blobbi
- [ ] funky favicon
- [ ] can every level event kind be rendered into a ogimage preview automatically, showing the board?

unsorted:
- [ ] custom sounds, eg goldeneye sounds
- [ ] put my profile pic somewhere below but near the game, and add some wheels that spin when I slide, so its like I'm sliding things.
