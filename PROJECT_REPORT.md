# Chronos — Technical Project Report

> Generated: 2026-04-19  
> Project version: 0.1.0  
> Framework: Next.js 14.2.29 · TypeScript 5.8.3 · Tailwind CSS 3.4.17

---

## 1. PROJECT STRUCTURE

### Full Directory Tree

```
chronos/
├── next-env.d.ts
├── next-i18next.config.js
├── next.config.js
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
│
├── public/
│   ├── icons/
│   │   ├── icon-192.svg
│   │   └── icon-512.svg
│   ├── locales/
│   │   ├── en/
│   │   │   └── common.json
│   │   └── es/
│   │       └── common.json
│   ├── manifest.json
│   └── sw.js
│
└── src/
    ├── components/
    │   ├── CategoryCard.tsx
    │   ├── ChronosLogo.tsx
    │   ├── InstallBanner.tsx
    │   ├── InstallInstructionsModal.tsx
    │   ├── LanguageSelector.tsx
    │   ├── QuestionCard.tsx
    │   ├── ReflectionPanel.tsx
    │   ├── ResultScreen.tsx
    │   ├── ScoreDisplay.tsx
    │   ├── StreakBadge.tsx
    │   └── StreakDisplay.tsx
    ├── data/
    │   └── questions/
    │       ├── index.ts
    │       ├── ancient-egypt.json
    │       ├── ancient-greece.json
    │       ├── byzantine-empire.json
    │       ├── crusades-chivalry.json
    │       ├── roman-empire.json
    │       └── vikings.json
    ├── hooks/
    │   ├── useGame.ts
    │   ├── useInstallPrompt.ts
    │   ├── useStats.ts
    │   ├── useStreak.ts
    │   └── useTextToSpeech.ts
    ├── pages/
    │   ├── _app.tsx
    │   ├── _document.tsx
    │   ├── categories.tsx
    │   ├── eras.tsx
    │   ├── index.tsx
    │   ├── stats.tsx
    │   └── game/
    │       └── [category].tsx
    ├── styles/
    │   └── globals.css
    └── types/
        └── index.ts
```

### Folder Purposes

| Folder | Purpose |
|---|---|
| `public/icons/` | SVG app icons for PWA (192×192 and 512×512) |
| `public/locales/` | next-i18next translation files (EN and ES) |
| `src/components/` | Reusable React UI components |
| `src/data/questions/` | Question bank split by historical category (6 JSON files + barrel index) |
| `src/hooks/` | Custom React hooks encapsulating all game and device logic |
| `src/pages/` | Next.js file-system routes; each file is a page |
| `src/pages/game/` | Dynamic game route `[category].tsx` |
| `src/styles/` | Global CSS (Tailwind base + custom utilities) |
| `src/types/` | Shared TypeScript interfaces and type aliases |

---

## 2. PAGES & ROUTING

### `src/pages/index.tsx` — Route: `/`

**Purpose:** Landing page. Shows the Chronos logo, a "Play" button (→ `/eras`), a "Stats" button (→ `/stats`), a language selector, the PWA install banner, and the current streak display.

**Key state / hooks:**
- `useTranslation('common')` — all visible text
- `useRouter` — navigation on button clicks
- `getStaticProps` with `serverSideTranslations`

**Notable:** Contains a hardcoded bilingual tagline `"Historical Trivia · Trivia Histórica"` that bypasses the i18n system.

---

### `src/pages/_app.tsx` — Root wrapper

**Purpose:** Wraps every page. Initialises i18n via `appWithTranslation`. Registers the service worker (`/sw.js`) in `useEffect`, only in production.

**Key state / hooks:**
- `useEffect` for service worker registration
- `AppProps` from Next.js

---

### `src/pages/_document.tsx` — HTML `<Document>`

**Purpose:** Custom HTML shell. Sets `<html lang>`, injects PWA meta tags (`theme-color: #09090f`, manifest link, apple-touch-icon), and the viewport meta.

---

### `src/pages/eras.tsx` — Route: `/eras`

**Purpose:** Era selection step. Displays 4 historical eras as cards with icons, year ranges, and question counts. Eras with no questions show a "coming soon" modal.

**Era definitions:**

| ID | Name | Years | Categories included |
|---|---|---|---|
| `ancient-age` | Ancient Age | ~3000 BCE – 476 CE | ancient-egypt, ancient-greece, roman-empire |
| `middle-ages` | Middle Ages | 476 – 1492 | byzantine-empire, crusades-chivalry, vikings |
| `early-modern` | Early Modern | 1492 – 1789 | *(no questions yet)* |
| `modern-era` | Modern Era | 1789 – present | *(no questions yet)* |

**Key state / hooks:**
- `useTranslation`, `useRouter`
- `useState(showComingSoon: boolean)` — triggers modal when clicking an empty era
- `useMemo` — computes question count per era from questions data

---

### `src/pages/categories.tsx` — Route: `/categories` or `/categories?era={eraId}`

**Purpose:** Category selection step. When an `era` query param is present it filters categories to that era and shows a 2-step breadcrumb (Era → Category). Without the param it shows all categories.

**Key state / hooks:**
- `useTranslation`, `useRouter`
- `useMemo` — derives Category objects from questions data, filtered by era

---

### `src/pages/game/[category].tsx` — Route: `/game/{category}`

**Purpose:** Core game loop. Runs a 10-question round for the selected category through three sequential phases:

1. **`playing`** — shows `QuestionCard`
2. **`reflecting`** — shows `ReflectionPanel` (explanation + meanwhile + reflective question + TTS)
3. **`finished`** — shows `ResultScreen` and `StreakDisplay`

**Props (from `getStaticProps`):**
```typescript
{
  categoryQuestions: Question[];
  categoryId: string;
}
```

**Static generation:** `getStaticPaths` generates paths for every category × every locale (`en`, `es`).

**Key state / hooks:** `useGame`, `useTranslation`, `useRouter`

---

### `src/pages/stats.tsx` — Route: `/stats`

**Purpose:** Statistics dashboard. Three rendering states: loading skeleton, empty state (no data yet), and full dashboard.

**Dashboard sections:**
- 4 summary cards: Total answered, Accuracy %, Sessions, Perfect sessions
- Correct vs. Wrong horizontal bar
- Per-category breakdown table
- Per-difficulty breakdown (easy / medium / hard)
- Insight block: strongest and weakest category
- Reset button with confirmation modal and toast notification

**Key state / hooks:**
- `useStats` — all persistent stats
- `useStreak` — current streak for header badge
- `useState`: `showResetModal`, `showToast`, `streakMounted` (hydration guard)
- `useMemo` — derived totals and per-category data
- `useEffect` — auto-dismiss toast after 2 s

---

## 3. COMPONENTS

### `CategoryCard.tsx`

**Renders:** A clickable button card for one quiz category. Shows icon, localised label, question count, and a difficulty badge.

**Props:**
```typescript
{
  category: Category;
  locale: Locale;
  onClick: () => void;
}
```

**Used by:** `categories.tsx`

---

### `ChronosLogo.tsx`

**Renders:** Hourglass SVG + `"CHRONOS"` wordmark, available in three sizes.

**Props:**
```typescript
{ size?: 'sm' | 'md' | 'lg' }  // default: 'md'
```

**Used by:** `index.tsx`, `categories.tsx`, `eras.tsx`, `game/[category].tsx`, `stats.tsx`, `ResultScreen.tsx`

---

### `InstallBanner.tsx`

**Renders:** Context-aware PWA install prompt. Three possible states:
- Already installed → renders `null`
- In WhatsApp WebView (Android) → shows an intent link to open in Chrome
- Installable → shows native `beforeinstallprompt` button

**Props:** none (uses `useInstallPrompt` internally)

**Used by:** `index.tsx`

---

### `InstallInstructionsModal.tsx`

**Renders:** Bottom-sheet modal with 3 numbered steps for manual PWA installation (for browsers that don't support `beforeinstallprompt`).

**Props:**
```typescript
{ onClose: () => void }
```

**Used by:** `InstallBanner.tsx`

---

### `LanguageSelector.tsx`

**Renders:** Two pill buttons (🇬🇧 EN / 🇪🇸 ES) that switch locale via `router.push` with `{ locale }`.

**Props:** none

**Used by:** `index.tsx`, `categories.tsx`, `eras.tsx`, `game/[category].tsx`, `stats.tsx`

---

### `QuestionCard.tsx`

**Renders:** Active question with difficulty badge, question text, two answer buttons (A / B), and a feedback banner after selection (✓ correct / ✗ incorrect). Buttons are disabled once an answer is selected.

**Props:**
```typescript
{
  question: Question;
  locale: Locale;
  selectedAnswer: number | null;
  onAnswer: (index: number) => void;
}
```

**Used by:** `game/[category].tsx`

---

### `ReflectionPanel.tsx`

**Renders:** Post-answer reflection screen with three rounded panels:
1. Explanation (historical detail)
2. Meanwhile (parallel world event)
3. Reflection (open question for the player)

Each panel has a speaker button (TTS). A "Continue" / "Finish" button advances the game.

**Props:**
```typescript
{
  question: Question;
  locale: Locale;
  isLast: boolean;
  onContinue: () => void;
}
```

**Used by:** `game/[category].tsx`

---

### `ResultScreen.tsx`

**Renders:** End-of-game summary with `ChronosLogo`, star rating (0–3 ⭐), score fraction, color-coded score display, a motivational message, and two action buttons (Play Again / Choose Category).

**Score color thresholds:**
| Ratio | Color |
|---|---|
| 1.0 (perfect) | Gold (`chronos-gold`) |
| ≥ 0.7 | Emerald |
| ≥ 0.4 | Blue |
| < 0.4 | Muted |

**Props:**
```typescript
{
  score: number;
  total: number;
  category: string;
}
```

**Used by:** `game/[category].tsx`

---

### `ScoreDisplay.tsx`

**Renders:** Top-of-game progress bar. Shows `Question X of Y`, a visual progress bar (hidden on mobile), and current score.

**Props:**
```typescript
{
  score: number;
  current: number;
  total: number;
}
```

**Used by:** `game/[category].tsx`

---

### `StreakBadge.tsx`

**Renders:** A compact 🔥 badge with the current streak number. Renders `null` if streak is 0 or component is not yet mounted (hydration guard).

**Props:** none

**Used by:** `categories.tsx`, `eras.tsx`, `stats.tsx`

---

### `StreakDisplay.tsx`

**Renders:** Contextual streak message in two contexts:

- `'home'` context: one of three statuses — `active_today`, `active_yesterday`, `lost`
- `'game_end'` context: one of four outcomes — `first_time`, `incremented`, `already_today`, `reset` — plus a "new record" flag

**Props:**
```typescript
{
  context: 'home' | 'game_end';
  playResult?: PlayResult;
}
```

**Used by:** `index.tsx`, `game/[category].tsx`

---

## 4. HOOKS

### `useGame.ts`

**Manages:** The entire game session state across 3 phases.

**State:**
```typescript
questions: Question[]       // shuffled subset of QUESTIONS_PER_ROUND (10)
currentIndex: number        // 0–9
score: number
phase: 'playing' | 'reflecting' | 'finished'
selectedAnswer: number | null
isCorrect: boolean | null
```

**Returns:**
```typescript
{
  ...state,
  currentQuestion: Question,
  total: number,              // always 10
  isLastQuestion: boolean,
  selectAnswer: (index: number) => void,
  nextQuestion: () => void,
  finishGame: () => void,
  playResult: PlayResult | null,
}
```

**Side effects:**
- Calls `useStats.recordAnswer` when phase transitions to `'reflecting'`
- Calls `useStats.recordSessionEnd` and `useStreak.registerPlay` when phase transitions to `'finished'`
- Uses a `useRef` flag to prevent double-recording

**Used by:** `game/[category].tsx`

---

### `useInstallPrompt.ts`

**Manages:** PWA installability detection and prompt flow.

**State:**
```typescript
mounted: boolean
canInstall: boolean           // beforeinstallprompt was captured
isInstalled: boolean          // display-mode: standalone or navigator.standalone
deferredPrompt: ref           // BeforeInstallPromptEvent
```

**Returns:**
```typescript
{
  canInstall: boolean,
  isInstalled: boolean,
  isInWhatsAppWebView: boolean,  // userAgent regex
  isAndroid: boolean,
  promptInstall: () => Promise<void>,
}
```

**Used by:** `InstallBanner.tsx`

---

### `useStats.ts`

**Manages:** Persistent game statistics in `localStorage` (key: `chronos_stats`).

**Storage schema:**
```typescript
interface Stats {
  totalAnswered: number;
  totalCorrect: number;
  totalSessions: number;
  perfectSessions: number;
  byCategory: Record<string, CategoryStats>;
  byDifficulty: Record<'easy'|'medium'|'hard', { answered: number; correct: number }>;
}

interface CategoryStats {
  answered: number;
  correct: number;
  lastPlayed: string;   // YYYY-MM-DD
}
```

**Returns:**
```typescript
{
  stats: Stats | null,
  recordAnswer: (question: Question, isCorrect: boolean) => void,
  recordSessionEnd: (score: number, total: number) => void,
  resetStats: () => void,
  getAccuracy: () => number,
  getCategoryAccuracy: (categoryId: string) => number,
  getDifficultyAccuracy: (difficulty: string) => number,
  getStrongestCategory: () => string | null,   // requires ≥5 answers
  getWeakestCategory: () => string | null,     // requires ≥5 answers
}
```

**Used by:** `useGame.ts`, `stats.tsx`

---

### `useStreak.ts`

**Manages:** Daily play streak in `localStorage` (key: `chronos_streak`).

**Storage schema:**
```typescript
interface StreakData {
  lastPlayedDate: string | null;   // YYYY-MM-DD
  currentStreak: number;
  longestStreak: number;
}
```

**Types:**
```typescript
type PlayResult = {
  result: 'first_time' | 'already_today' | 'incremented' | 'reset';
  newStreak: number;
  isNewRecord: boolean;
}

type StreakStatus = 'never_played' | 'active_today' | 'active_yesterday' | 'lost'
```

**Streak logic:**
- Last played = today → `already_today`
- Last played = yesterday → `incremented` (streak + 1)
- Last played = anything else → `reset` (streak = 1)
- Never played → `first_time`
- `isNewRecord` = `newStreak > 1 && newStreak > longestStreak`

**Returns:**
```typescript
{
  currentStreak: number,
  longestStreak: number,
  lastPlayedDate: string | null,
  registerPlay: () => PlayResult,
  getStreakStatus: () => StreakStatus,
}
```

**Used by:** `useGame.ts`, `StreakBadge.tsx`, `StreakDisplay.tsx`, `stats.tsx`

---

### `useTextToSpeech.ts`

**Manages:** Browser Web Speech API (`SpeechSynthesisUtterance`) with language-aware voice selection.

**Configuration:**
- Rate: `0.88`, Pitch: `1.05`
- Disabled entirely on Android (`isSupported = false`)
- Voice preference order per locale:
  - `en` → `en-US`, `en-GB`, `en-AU`
  - `es` → `es-ES`, `es-MX`, `es-AR`
- Quality keyword priority: `neural`, `natural`, `premium`, `enhanced`

**Returns:**
```typescript
{
  speak: (text: string, lang: string, id: string) => void,
  stop: () => void,
  speakingId: string | null,
  isSupported: boolean,
}
```

**Used by:** `ReflectionPanel.tsx`

---

## 5. DATA LAYER

### Question Distribution

| File | Category ID | Era | Questions |
|---|---|---|---|
| `ancient-egypt.json` | `ancient-egypt` | Ancient Age | 10 |
| `ancient-greece.json` | `ancient-greece` | Ancient Age | 5 |
| `roman-empire.json` | `roman-empire` | Ancient Age | 5 |
| `byzantine-empire.json` | `byzantine-empire` | Middle Ages | 10 |
| `crusades-chivalry.json` | `crusades-chivalry` | Middle Ages | 10 |
| `vikings.json` | `vikings` | Middle Ages | 10 |
| **Total** | | | **50** |

Categories `early-modern` and `modern-era` have no questions yet.

### Question ID Scheme

IDs follow a prefix + zero-padded number pattern:

| Prefix | Category |
|---|---|
| `eg-` | Ancient Egypt |
| `gr-` | Ancient Greece |
| `ro-` | Roman Empire |
| `bz-` | Byzantine Empire |
| `cr-` | Crusades & Chivalry |
| `vk-` | Vikings |

### TypeScript Interface

```typescript
// src/types/index.ts

export type Locale = 'en' | 'es';

export interface LocalizedString {
  en: string;
  es: string;
}

export interface Question {
  id: string;                              // e.g. "eg-001"
  category: string;                        // e.g. "ancient-egypt"
  category_label: LocalizedString;         // { en: "Ancient Egypt", es: "Egipto Antiguo" }
  difficulty: 'easy' | 'medium' | 'hard';
  question: LocalizedString;
  options: [LocalizedString, LocalizedString];  // exactly 2 options
  correctIndex: 0 | 1;
  explanation: LocalizedString;            // historical context after answering
  meanwhile: LocalizedString;             // parallel world event
  reflection: LocalizedString;            // open-ended reflective prompt
}

export interface Category {
  id: string;
  label: LocalizedString;
  count: number;
  difficulties: Question['difficulty'][];
}

export type GamePhase = 'playing' | 'reflecting' | 'finished';

export interface GameState {
  questions: Question[];
  currentIndex: number;
  score: number;
  phase: GamePhase;
  selectedAnswer: number | null;
  isCorrect: boolean | null;
}
```

### Barrel Export

`src/data/questions/index.ts` imports all 6 JSON files and re-exports them as a single flat default array, maintaining backwards compatibility with all page imports.

---

## 6. TRANSLATIONS (i18n)

### Configuration

- **Library:** next-i18next 15.3.1
- **Default locale:** `en`
- **Supported locales:** `en`, `es`
- **Namespace:** `common` (single namespace)
- **Translation files:** `public/locales/{locale}/common.json`

### All Translation Keys (68 total)

```
home.tagline
home.subtitle
home.playButton
home.languageLabel

eras.title
eras.stepEra
eras.stepCategory
eras.continue
eras.questions
eras.noQuestions
eras.soon
eras.comingSoonDesc
eras.ancient-age.name
eras.ancient-age.years
eras.ancient-age.description
eras.middle-ages.name
eras.middle-ages.years
eras.middle-ages.description
eras.early-modern.name
eras.early-modern.years
eras.early-modern.description
eras.modern-era.name
eras.modern-era.years
eras.modern-era.description

categories.title
categories.questions
categories.difficulty.easy
categories.difficulty.medium
categories.difficulty.hard

game.score
game.question
game.of
game.correct
game.incorrect
game.option_a
game.option_b

reflection.title
reflection.meanwhileTitle
reflection.reflectionTitle
reflection.continue
reflection.finish

results.title
results.perfect
results.playAgain
results.chooseCategory
results.messages.low
results.messages.medium
results.messages.high
results.messages.perfect

audio.read
audio.stop

nav.back
nav.home

stats.title
stats.viewStats
stats.answered
stats.accuracy
stats.sessions
stats.perfectSessions
stats.correct
stats.wrong
stats.byCategory
stats.byDifficulty
stats.answeredCount
stats.currentStats
stats.yourStrength
stats.strengthMessage
stats.notEnoughData
stats.empty.title
stats.empty.subtitle
stats.empty.cta
stats.reset
stats.resetConfirm.title
stats.resetConfirm.text
stats.resetConfirm.cancel
stats.resetConfirm.confirm

install.banner.title
install.banner.cta
install.whatsapp.message
install.whatsapp.cta
install.help.link
install.help.title
install.help.step1
install.help.step2
install.help.step3
install.help.close

streak.dayCount_one
streak.dayCount_other
streak.home.activeToday
streak.home.activeYesterday
streak.home.lost
streak.gameEnd.firstTime
streak.gameEnd.firstStreak
streak.gameEnd.incremented
streak.gameEnd.newRecord
streak.gameEnd.alreadyToday
```

### Keys with Interpolation

| Key | Variable(s) |
|---|---|
| `stats.strengthMessage` | `{{category}}`, `{{accuracy}}` |
| `streak.dayCount_one` / `_other` | `{{count}}` |
| `streak.gameEnd.incremented` | `{{count}}` |
| Various streak keys | `{{weak}}` |

### Missing / Mismatched Keys

**None.** Both `en/common.json` and `es/common.json` contain identical sets of 68 keys. No translation is missing in either language.

### Plural Forms

`streak.dayCount_one` / `streak.dayCount_other` — uses standard i18next `_one` / `_other` pluralization suffix.

---

## 7. PWA CONFIG

### `public/manifest.json`

```json
{
  "name": "Chronos — Historical Trivia",
  "short_name": "Chronos",
  "description": "Journey through the ages with multilingual historical trivia.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090f",
  "theme_color": "#f5a623",
  "orientation": "portrait",
  "categories": ["games", "education"],
  "icons": [
    {
      "src": "/icons/icon-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.svg",
      "sizes": "512x512",
      "type": "image/svg+xml",
      "purpose": "any maskable"
    }
  ]
}
```

> **Note:** Icons are SVG only. Some platforms (notably older Android) require raster PNG icons for proper maskable icon support. There are no PNG fallbacks.

### `public/sw.js` — Service Worker

**Cache name:** `chronos-v1`

**Precached assets (install event):**
```
/
/categories
/manifest.json
/icons/icon-192.svg
/icons/icon-512.svg
```

**Fetch strategy — dual mode:**

| Request pattern | Strategy |
|---|---|
| `/_next/static/*` (hashed assets) | Cache-first (immutable, never stale) |
| All other GET requests | Network-first → fallback to cache → fallback to `/` |

**Lifecycle:**
- `install` — precaches assets, calls `skipWaiting()` (activates immediately)
- `activate` — deletes any cache not named `chronos-v1`, calls `clients.claim()`
- `fetch` — skips non-GET and cross-origin requests; clones responses before caching

---

## 8. TAILWIND & THEMING

### Custom Color Palette (`chronos.*`)

| Token | Hex | Usage |
|---|---|---|
| `chronos-bg` | `#09090f` | Page background (near-black) |
| `chronos-surface` | `#111118` | Slightly lighter surface layer |
| `chronos-card` | `#16161f` | Card / panel backgrounds |
| `chronos-border` | `#1e1e2e` | Borders and dividers |
| `chronos-gold` | `#f59e0b` | Primary accent — CTAs, icons |
| `chronos-gold-light` | `#fcd34d` | Lighter gold for highlights |
| `chronos-gold-dim` | `#92400e` | Darker gold for hover/pressed |
| `chronos-muted` | `#6b7280` | Secondary / muted text |
| `chronos-text` | `#e5e7eb` | Primary text |

### Custom Fonts

| Token | Stack |
|---|---|
| `font-sans` | Inter, system-ui, sans-serif |
| `font-display` | Georgia, serif |

### Custom Animations

| Name | Duration | Effect |
|---|---|---|
| `animate-fade-in` | 0.4 s ease-out | opacity 0 → 1 |
| `animate-slide-up` | 0.4 s ease-out | opacity + translateY(20px → 0) |
| `animate-slide-down` | 0.35 s ease-out | opacity + translateY(-16px → 0) |
| `animate-pulse-gold` | 2 s ∞ ease-in-out | opacity pulse |

### CSS Variables

No CSS custom properties (`--var`) are defined. All theming is done exclusively through Tailwind utility classes using the `chronos.*` tokens above.

### Content Paths

Tailwind scans:
```
./src/pages/**/*.{js,ts,jsx,tsx,mdx}
./src/components/**/*.{js,ts,jsx,tsx,mdx}
```

---

## 9. DEPENDENCIES

### Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 14.2.29 | Framework (Pages Router, SSG, i18n routing) |
| `react` | ^18.3.1 | UI library |
| `react-dom` | ^18.3.1 | DOM renderer |
| `next-i18next` | ^15.3.1 | i18n for Next.js (server + client) |
| `react-i18next` | ^15.5.2 | React bindings for i18next |
| `i18next` | ^24.2.2 | Core i18n engine |

### Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ^5.8.3 | Type checker |
| `@types/node` | ^20.17.31 | Node.js type definitions |
| `@types/react` | ^18.3.20 | React type definitions |
| `@types/react-dom` | ^18.3.5 | ReactDOM type definitions |
| `tailwindcss` | ^3.4.17 | Utility-first CSS framework |
| `autoprefixer` | ^10.4.21 | PostCSS vendor prefixing |
| `postcss` | ^8.5.3 | CSS transformation pipeline |
| `eslint` | ^8.57.1 | Linter |
| `eslint-config-next` | 14.2.29 | Next.js ESLint ruleset |

### Compatibility Notes

- **`next@14.2.29`** is a patch release from the 14.x LTS line. Next.js 15 is available but would require migration (App Router changes, React 19, etc.). No immediate action needed.
- **`eslint@8`** is the last v8 release. ESLint 9 ships a flat config format incompatible with the current `.eslintrc` style. No upgrade path is blocked today but it will be required eventually.
- **`next-i18next@15` + `i18next@24`**: versions are consistent and compatible. No conflicts detected.
- **No animation library** (Framer Motion, etc.) — all animations are pure CSS via Tailwind custom keyframes.
- **No state management library** — all state is React-local or via `localStorage`. Appropriate for the current scale.
- **No testing library** — there are zero test files in the project. `jest`, `@testing-library/react`, or `vitest` are not installed.

---

## 10. KNOWN ISSUES & TODOS

### TODO / FIXME Comments

**None found.** A search across all `src/` files returned zero `TODO` or `FIXME` comments.

### `console.log` Statements

**None found.** No `console.log` calls exist in any source file.

### Hardcoded Strings That Should Be in i18n

The following user-visible strings are rendered directly in JSX without going through the `t()` translation function:

| File | Approx. line | Hardcoded string |
|---|---|---|
| `src/pages/index.tsx` | ~71 | `"Historical Trivia · Trivia Histórica"` (bottom tagline) |
| `src/pages/stats.tsx` | ~176 | `"{currentStreak}-day streak"` |
| `src/pages/stats.tsx` | ~185 | `"🌟 {currentStreak} days strong — keep the fire burning!"` |
| `src/pages/stats.tsx` | ~389 | `"✓ Statistics reset"` (toast message after reset) |

All four strings are English-only and will not adapt when the user switches to Spanish.

---

## 11. WHAT IS NOT YET IMPLEMENTED

### Empty Eras (no questions)

The eras page defines four historical periods, but only two are populated:

| Era | Status |
|---|---|
| Ancient Age | ✅ 20 questions across 3 categories |
| Middle Ages | ✅ 30 questions across 3 categories |
| Early Modern (1492–1789) | ❌ No JSON file, no questions |
| Modern Era (1789–present) | ❌ No JSON file, no questions |

Clicking an empty era shows a "coming soon" modal instead of navigating forward.

### PNG Icons for PWA

Both icons (`icon-192.svg`, `icon-512.svg`) are SVG. The Web App Manifest spec recommends at least one PNG icon for broad platform compatibility (especially for Android splash screens and some iOS versions). No PNG versions exist.

### No Test Suite

There is no test infrastructure in the project:
- No `jest.config.*`, no `vitest.config.*`
- No `__tests__/` directory
- No `*.test.ts` or `*.spec.ts` files
- No `@testing-library/*` packages

### No Error Boundary

There is no React `ErrorBoundary` component. An uncaught render error in any component will crash the full page without a user-friendly fallback.

### No 404 Page

There is no `src/pages/404.tsx`. Next.js will fall back to its default generic 404 page, which does not match the Chronos visual theme.

### No Offline Fallback Page

The service worker falls back to `/` on network failure, but there is no dedicated offline page (e.g., `/offline`) that would give the user a clear message when they are offline and the cached route is unavailable.

### Difficulty Filtering Not Implemented

The `Category` type stores a `difficulties` array and difficulty badges are shown on cards, but there is no UI or route to filter or select questions by difficulty. All games always draw randomly from the full category pool.

### Stats `strengthMessage` Translation Key Incomplete

The key `stats.strengthMessage` references a `{{weak}}` interpolation variable in the translation strings, but the current stats page UI only displays the strongest category section. A "weakest category" message block visible in the translation keys does not appear to have a corresponding UI implementation.
