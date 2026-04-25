# Hanzi Memory Recall

A React-based spaced repetition app for learning Mandarin Chinese characters.

## Features

- **Spaced Repetition (SM-2)**: Optimized study intervals based on your performance
- **Practice Exercises**: 5 different exercise types for varied learning
  - Image → Hanzi: Visual word recognition
  - Hanzi → Pinyin: Pinyin matching with tone distractors
  - Pinyin → Hanzi: Character recognition from pronunciation
  - English → Hanzi: Translation recall
  - Hanzi → English: Meaning recognition
- **Image Associations**: Fetches relevant images from Unsplash to aid visual learning
- **Word Management**: Enable/disable words, reset progress, filter by status
- **Progress Tracking**: Detailed statistics on learning progress and mastery rate
- **Offline Support**: PWA-enabled for offline studying

## Quick Start

```bash
# Install dependencies
pnpm install

# Export words from database (run from utils/hanzi_words)
cd utils/hanzi_words
uv run python export_for_web.py --output ../../public/data/words.json

# Start dev server
cd ../..
pnpm run dev
```

## Development Commands

```bash
# Type check
pnpm run type-check

# Lint
pnpm run lint

# Lint and auto-fix
pnpm run lint:fix

# Run all checks (TypeScript + ESLint)
pnpm run verify

# All checks run automatically on git commit via husky + lint-staged
```

## Building for Production

```bash
# Export database first
pnpm run export-db

# Build
pnpm run build
```

## Deployment to GitHub Pages

### Option 1: Manual Deploy Script

```bash
./deploy.sh
```

### Option 2: GitHub Actions (Automatic)

Pushes to `main` branch automatically trigger deployment via GitHub Actions.

Your app will be available at:
```
https://jricardo27.github.io/recaller/
```

## Configuration

### Environment Variables

Create `.env` file (copy from `.env.example`):

```env
# Unsplash API Key for image fetching
# Get a free key at: https://unsplash.com/developers
VITE_UNSPLASH_KEY=your_unsplash_access_key_here

# Maximum new words per study session (default: 10)
VITE_MAX_NEW_PER_DAY=10

# Default ease factor for SM-2 algorithm (default: 2.5)
VITE_DEFAULT_EASE_FACTOR=2.5
```

**Note:** Environment variables must be prefixed with `VITE_` to be accessible in the browser.

## Study Flow

1. **New Words**: Up to 10 new words per session (shown first)
2. **Review Queue**: Cards due for review shown after new words
3. **Rating**: Rate recall quality from "Again" (1) to "Perfect" (5)
4. **Intervals**: Difficult cards appear sooner; easy cards later

## Word Categories

| Status | Description |
|--------|-------------|
| New | Never studied before |
| Learning | Studied but not mastered |
| Due | Ready for review |
| Mastered | Interval > 30 days |
| Disabled | Hidden from study |

## Tech Stack

- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- Zustand (state management)
- date-fns (date calculations)
- SM-2 Algorithm (spaced repetition)

## Project Structure

```
src/
├── components/
│   ├── Flashcard/      # Study card UI
│   ├── Study/          # Study session manager
│   ├── WordManager/    # Word enable/disable UI
│   ├── Stats/          # Progress dashboard
│   └── Exercise/       # Practice exercises
│       ├── ExerciseMenu.tsx    # Exercise selection
│       └── Exercise.tsx        # Exercise gameplay
├── stores/
│   ├── wordStore.ts    # Zustand state management
│   └── exerciseStore.ts # Exercise state & scoring
├── algorithms/
│   └── sm2.ts          # SM-2 implementation
├── types/
│   ├── index.ts        # Core TypeScript types
│   └── exercise.ts     # Exercise types
└── config/
    └── env.ts          # Environment configuration

public/
└── data/
    └── words.json      # Exported from SQLite (static assets)
```

## Database Integration

The app reads from a static JSON file exported from the SQLite database:

```bash
# From utils/hanzi_words
python export_for_web.py --output ../../public/data/words.json
```

Progress is stored locally in the browser (localStorage + IndexedDB).

## Future Enhancements

- [ ] Audio pronunciation
- [ ] Custom word images
- [ ] Sync across devices
- [ ] Writing practice canvas
- [ ] HSK level filtering
- [ ] Study streaks
