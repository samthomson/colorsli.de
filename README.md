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

- Every non-empty color count must be divisible by 4.
- Only exact runs of 4 clear.
- Fresh boards must start with no run of 4+.
- Match clearing only happens on drag release.

## 🏗️ Project Structure

```text
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

- [ ] a bunch of levels (where one unlocks the next)
- [ ] level editor
- [ ] Add color themes
- [ ] Add sound effects
- [ ] nice effects on teh circles, including when bursting, and noises
- [ ] level ideas
  - [ ] 60s; colour changing
  - [ ] moving boards
  - [ ] hokusai views of fuji
  - [ ] hal 9000
- [ ] dm, private levels
- [ ] level sound track?
- [ ] browse others levels
- [ ] scoring
- [ ] publish score / level completion
- [ ] zap a level author
- [ ] espy colour picker
