# Next Steps

## Overview

Work planned in priority order:

1. **Phase 0: Bug Fixes** - Fix export bug ✅ DONE
2. **Phase 1: Reactive Framework** - Build minimal reactive UI framework ✅ DONE (131 tests)
3. **Phase 2: Fresh UI + Neobrutalism** - Delete old UI, write fresh reactive components with neobrutalism design ✅ DONE
4. **Phase 3: Dashboard + UI Polish** - Dashboard, simplified routing, pause/resume ✅ ~90% DONE
5. **Phase 3.1: Audio Recording Bug** - Fix reactive feedback loop causing UI flicker ✅ DONE
6. **Phase 3.2: UX Improvements** - Two-column layouts, better button placement, summary redesign 🔜 NEXT
7. **Phase 4: Mic Check** - Pre-session microphone check with audio level visualization
8. **Phase 5: Core Engine** - Add missing behavioral metrics + complete 42 todo tests

## Key Design Decisions

| Decision               | Choice                          | Rationale                                         |
| ---------------------- | ------------------------------- | ------------------------------------------------- |
| Development approach   | TDD                             | Write tests first, then implementation            |
| Signal API             | Tuple: `[get, set] = signal(0)` | Familiar, explicit read/write                     |
| Modals                 | **Removed entirely**            | Use two-click inline pattern instead              |
| Debug view             | **Removed**                     | Use `window.IDS` API for debugging                |
| CSS location           | Keep in `web/css/styles.css`    | Single file, neobrutalism design                  |
| Timer logic            | Lives in AppStore               | Global behavior, not component-specific           |
| Helpers                | Module-scoped, no OOP           | Timer, audio, storage as factory functions        |
| `getAppState()` return | Live session object             | E2E tests depend on `session.dispatch()`          |
| Router                 | Replace entirely                | New framework router replaces `web/src/router.ts` |
| Migration strategy     | **Fresh start**                 | Delete old UI, write new from scratch             |
| Theme                  | **Dark neobrutalism**           | Dark bg, light borders, bold colors               |
| URL structure          | **Phase not in URL**            | Each route must be directly navigable             |
| Session routes         | `/#/:id` renders current phase  | Phase is state, not route                         |
| Recording              | **Auto-start/stop**             | Reduces friction, PRD says "audio recorded"       |
| Pause                  | Available on all timed phases   | Handle technical issues gracefully                |
| Pause behavior         | **Pauses timer + recording**    | Least surprise; privacy; consistent mental model  |
| Soft delete            | `deletedAt` timestamp           | Enable future eviction policy                     |
| Abandon behavior       | **Soft delete** (not hard)      | Future analytics; consistent with completed       |
| Global nav             | Clickable title + back link     | Easy return to Dashboard from anywhere            |

## Two-Click Inline Pattern (Replaces Modals)

For destructive actions like "Discard session":

1. **First click**: Button changes to "Confirm?" (danger styling)
2. **Second click**: Executes the action
3. **Click elsewhere or wait 3s**: Reverts to original state

This eliminates:

- ~300 lines of modal code
- Complex lifecycle (body scroll lock, focus trap, escape key)
- Portal/overlay framework primitives

---

## Phase 0: Bug Fixes ✅ DONE

### 0.1 Fix Export - Empty code.txt and invariants.txt ✅

**Fixed**: `extractSessionData()` now correctly reads from `event.data.code` and `event.data.invariants`

### 0.2 Fix Export - Empty reflection in session.json ✅

**Fixed**: `buildExportData()` now correctly reads from `event.data.responses`

### 0.3 Add Export E2E Tests ✅

**Added**: Comprehensive export tests that actually verify tar.gz contents.

---

## Phase 1: Reactive Framework Core ✅ DONE

**Goal**: Build a minimal reactive UI framework to replace string templates

**Status**: Complete - 131 unit tests passing

### 1.1 Files Created

```
web/src/framework/
├── reactive.ts     # signal, derived, watch, batch
├── elements.ts     # h, div, span, Show, For
├── component.ts    # mount, onMount, onCleanup, context
├── store.ts        # createStore, useStore, useActions
├── router.ts       # createRouter, useRouter, useRoute, Link
└── index.ts        # public exports

tests/framework/
├── reactive.test.ts   # 13 tests
├── elements.test.ts   # 51 tests
├── component.test.ts  # 19 tests
├── store.test.ts      # 13 tests
└── router.test.ts     # 35 tests
```

### 1.2 Foundation Helpers ✅ DONE

```
web/src/helpers/timer.ts    # Timer factory (26 tests)
web/src/storage.ts          # Refactored to factory pattern
web/src/store.ts            # AppStore (12 tests)
```

---

## Phase 2: Fresh UI + Neobrutalism ✅ DONE

**Goal**: Delete all old UI code, write fresh reactive components with neobrutalism styling

**Status**: Complete - All E2E tests passing (85 tests)

### 2.1 What Was Done

- Deleted old string-template UI code (`app.ts`, `router.ts`, `modals/`, old components)
- Created 11 shared components with neobrutalism styling
- Created 6 screens for all phases
- Wired router with `window.IDS` API for E2E testing
- Rewrote `modals.spec.ts` for two-click confirmation pattern
- Implemented URL-based session restoration

### 2.2 Components Created

| Component               | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `Button.ts`             | Neobrutalism button with variants (primary, secondary, danger, ghost) |
| `Timer.ts`              | MM:SS display with warning/overtime states                            |
| `Toast.ts`              | Toast notification manager                                            |
| `ConfirmButton.ts`      | Two-click inline confirm pattern                                      |
| `PhaseHeader.ts`        | Phase badge + timer + actions                                         |
| `PresetCard.ts`         | Clickable preset selection                                            |
| `ProblemCard.ts`        | Problem display (collapsible)                                         |
| `InvariantsInput.ts`    | Controlled textarea                                                   |
| `CodeEditor.ts`         | Code textarea + Tab key handling                                      |
| `NudgeButton.ts`        | Nudge request with count                                              |
| `RecordingIndicator.ts` | Recording status                                                      |

### 2.3 Screens Created

| Screen                | Key Elements                                           |
| --------------------- | ------------------------------------------------------ |
| `HomeScreen.ts`       | PresetCards, ConfirmButton, resume banner              |
| `PrepScreen.ts`       | PhaseHeader, ProblemCard, InvariantsInput              |
| `CodingScreen.ts`     | PhaseHeader, CodeEditor, NudgeButton (CODING + SILENT) |
| `SummaryScreen.ts`    | Stats display, continue button                         |
| `ReflectionScreen.ts` | Radio button form                                      |
| `DoneScreen.ts`       | Export button, new session button                      |

### 2.4 Neobrutalism Design Spec

**Key Characteristics:**

| Property      | Value                                  |
| ------------- | -------------------------------------- |
| Borders       | 3px solid (light on dark bg)           |
| Box shadows   | `4px 4px 0 0` (hard offset, no blur)   |
| Border radius | 5px (small, not rounded)               |
| Colors        | Bold, high-contrast, no gradients      |
| Typography    | 700-900 weight headings                |
| Hover         | `translate(-2px, -2px)` + shadow grows |
| Active        | `translate(2px, 2px)` + shadow shrinks |

**Color Palette (Dark Theme):**

```css
:root {
  /* Base */
  --bg: #1a1a2e;           /* Dark blue-black */
  --bg-secondary: #16213e; /* Slightly lighter */
  --text: #edf2f4;         /* Off-white text */
  --text-muted: #8b949e;   /* Muted text */

  /* Borders & Shadows */
  --border: #edf2f4;       /* Light borders on dark bg */
  --shadow: #edf2f4;       /* Light shadow */

  /* Accents */
  --primary: #e9c46a;      /* Gold - focus color */
  --success: #52b788;      /* Green - completed */
  --warning: #f4a261;      /* Orange - warning/silent */
  --danger: #e76f51;       /* Red - danger */
  --prep: #9d4edd;         /* Purple - prep phase */
  --coding: #06d6a0;       /* Teal - coding phase */
}
```

---

## Phase 3.0: Routing Refactor ✅ DONE

**Goal**: Fix broken routing architecture before continuing with Phase 3

**Status**: Core routing fixed. E2E tests need selector updates.

### 3.0.1 What Was Fixed

| Issue                                           | Fix                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Router context lost on reactive updates**     | Keep `activeRouterContext` set for router lifetime (not just during initial render)                                 |
| **`Switch` component not creating owner scope** | Added `createRoot()` wrapper for each case render                                                                   |
| **`Show` component not creating owner scope**   | Added `createRoot()` wrapper for each branch render                                                                 |
| **IDS API manipulating hash directly**          | Removed `window.location.hash` from `startSession`, `abandonSession`, `resetApp` - they now only call store actions |

### 3.0.2 Design Decision (Confirmed)

> **Phase is state, not route** - `/#/:id` renders current phase based on `AppStore.screen`
> **URL structure** - Each route must be directly navigable

Routes:

- `/#/` - Dashboard
- `/#/new` - New session (preset selection)
- `/#/:id` - Session (renders phase based on `state.screen`)
- `/#/:id/view` - Read-only view (TODO)

### 3.0.3 Changes Made

1. **`web/src/framework/router.ts`**:
   - Keep `activeRouterContext` active for router lifetime
   - Use `createRoot()` for route component rendering
   - Proper cleanup via `onCleanup`

2. **`web/src/framework/elements.ts`**:
   - `Switch`: Use `createRoot()` for each case render, dispose on switch
   - `Show`: Use `createRoot()` for each branch render, dispose on switch

3. **`web/src/framework/component.ts`**:
   - Added `createRoot()` function for dynamic component scoping
   - Silenced `onMount`/`onCleanup` warnings (components render correctly even if lifecycle hooks don't register in dynamic contexts)

4. **`web/src/main.ts`**:
   - IDS API methods no longer navigate (removed `window.location.hash` manipulation)
   - Updated `router.getCurrentRoute()` to match new route structure

5. **`e2e/routing.spec.ts`**: Rewritten for new routing architecture

### 3.0.4 E2E Test Status

E2E tests are re-enabled but many need updates:

- Tests use old selectors (`.start-button`, `.start-coding-button`)
- Tests navigate to `/` expecting HomeScreen but get DashboardScreen
- Tests expect URL to include phase (`/#/:id/prep`) but URL is now `/#/:id`

**Pattern for fixing tests**:

```typescript
// Before (broken)
await page.goto("/");
await page.click(".start-button");

// After (correct)
await page.goto("/#/new");
await page.click('button:has-text("Start Session")');
```

### 3.0.5 Manual Testing Results

Full session flow tested and working:

- Dashboard → New Session → Prep → Coding → Summary → Reflection → Done ✅
- Phase transitions render correct screens ✅
- Router context available in all screens ✅
- URL stays as `/#/:sessionId` during phase transitions ✅

---

## Phase 3: Dashboard + UI Polish ✅ ~90% DONE

**Goal**: Add dashboard for session management, simplify routing, improve coding screen layout, add pause/resume and auto-recording

**Status**: Most features complete. Blocked by audio recording bug (Phase 3.1).

### 3.1 What Was Completed

| Item                                                    | Status                   |
| ------------------------------------------------------- | ------------------------ |
| `DashboardScreen.ts`                                    | ✅ Created               |
| `SessionScreen.ts`                                      | ✅ Created               |
| `ViewScreen.ts`                                         | ✅ Created (placeholder) |
| `HomeScreen.ts` (serves as NewSessionScreen)            | ✅ Created               |
| `AppHeader.ts` component                                | ✅ Created               |
| `StatsCard.ts` component                                | ✅ Created               |
| `SessionCard.ts` component                              | ✅ Created               |
| `PauseButton.ts` component                              | ✅ Created               |
| `isPaused` state + `pauseSession()`/`resumeFromPause()` | ✅ Implemented           |
| `softDeleteSession()` + `deletedAt` field               | ✅ Implemented           |
| `getSessionStats()`                                     | ✅ Implemented           |
| `dashboard.spec.ts` E2E tests                           | ✅ Passing               |
| `pause.spec.ts` E2E tests                               | ✅ Passing               |
| Routes updated in `main.ts`                             | ✅ Done                  |
| Timer paused styling                                    | ✅ Done                  |
| Button ghost variant                                    | ✅ Done                  |

### 3.2 Remaining Work (After Bug Fix)

| Item                              | Status                      |
| --------------------------------- | --------------------------- |
| Fix audio recording feedback loop | 🔴 BLOCKING (see Phase 3.1) |
| `MicStatusIndicator` component    | ⏳ Not started              |
| `CollapsibleSection` component    | ⏳ Not started              |
| Two-column coding layout          | ⏳ Not started              |
| `ViewScreen` full implementation  | ⏳ Placeholder exists       |

### 3.3 E2E Test Status

```
106 passed
11 skipped
```

### 3.4 Route Structure

| Route         | Screen          | Description                                       |
| ------------- | --------------- | ------------------------------------------------- |
| `/#/`         | DashboardScreen | Session list, stats, "New Session" button         |
| `/#/new`      | HomeScreen      | Preset selection                                  |
| `/#/:id`      | SessionScreen   | Active session (renders current phase internally) |
| `/#/:id/view` | ViewScreen      | Read-only view of completed session               |

**Key Principle**: Each route must be directly navigable. Phase is state, not route.

### 3.5 Edge Cases Reference

See sections 3.9 in git history for full edge case tables. Key decisions:

- Pause: Pauses timer AND recording
- Abandoned sessions: Soft delete with `deletedAt` timestamp
- Recording: Auto-start on Coding, auto-stop on Summary or abandon

---

## Phase 3.1: Fix Audio Recording Feedback Loop ✅ DONE

**Goal**: Fix the reactive feedback loop causing CodingScreen to flicker when audio recording is active

**Status**: Complete - Fixed by moving audio lifecycle from component to store.

### Problem Summary

When entering the Coding phase with audio recording enabled:

- REC indicator flickers on/off rapidly (~37ms cycles instead of stable)
- Code textarea becomes unresponsive
- Buttons can't be clicked
- Playwright reports "element was detached from the DOM"

**Root Cause** (confirmed via Chrome DevTools trace analysis):

A reactive feedback loop where:

1. `mediaRecorder.onstop` updates `isRecording` signal → `notifyStateChange()`
2. Signal change triggers component re-render (via Show/Switch disposing and recreating)
3. Component disposal calls `onCleanup` → `stopRecording()`
4. New component mounts → `onMount` → `startRecording()`
5. Cycle repeats ~262 times in 7 seconds (should be 0-1)

**Evidence from trace:**

- 262 `onstop` events (should be 0-1 in a normal session)
- 35µs gap between `ondataavailable` and `onstop` proves `stop()` called synchronously
- 92-102ms duration for each `onstop` handler (component disposal + recreation + IndexedDB)

### Solution

Move audio lifecycle from component lifecycle (CodingScreen) to store-managed phase transitions.

**Recording runs during**: Coding + Silent phases

**Start triggers**:

- `startCoding()` - Transition from Prep to Coding
- `resumeFromPause()` - When unpausing during Coding/Silent (already exists)
- `_loadSession()` - When resuming a session in Coding/Silent phase

**Stop triggers**:

- `submitSolution()` - Early submission (skips to Summary)
- `handlePhaseExpiry()` for Silent→Summary - Natural timer expiry
- `pauseSession()` - Pausing (already exists)
- `abandonSession()` - Abandoning session

### Changes Required

| File                              | Change                                                             |
| --------------------------------- | ------------------------------------------------------------------ |
| `web/src/screens/CodingScreen.ts` | Remove `onMount`, `watch`, `onCleanup` for audio (~45 lines)       |
| `web/src/store.ts`                | Add `startRecording()` in `startCoding()`                          |
| `web/src/store.ts`                | Add `stopRecording()` in `submitSolution()`                        |
| `web/src/store.ts`                | Add `stopRecording()` in `handlePhaseExpiry()` for Silent→Summary  |
| `web/src/store.ts`                | Add `stopRecording()` in `abandonSession()`                        |
| `web/src/store.ts`                | Add recording resume in `_loadSession()` if phase is Coding/Silent |
| `web/src/audio.ts`                | Add guard in `onstop` to prevent redundant state notifications     |

### Checkpoint

- [x] Remove audio lifecycle from CodingScreen.ts
- [x] Add `startRecording()` to `startCoding()` action
- [x] Add `stopRecording()` to `submitSolution()` action
- [x] Add `stopRecording()` to `handlePhaseExpiry()` for Silent→Summary
- [x] Add `stopRecording()` to `abandonSession()` action
- [x] Add recording resume to `_loadSession()` for Coding/Silent phases
- [x] Add guard in `audio.ts` onstop handler
- [x] Manual test: REC indicator stable, textarea usable
- [x] E2E tests pass: `bun run test:e2e`
- [x] Full CI passes: `bun run ci`
- [x] Commit: `fix(web): move audio lifecycle to store, prevent feedback loop`

---

## Phase 3.2: UX Improvements 🔜 NEXT

**Goal**: Improve Prep, Coding, and Summary screen layouts for better UX

**Status**: Planned, ready to implement in chunks

### 3.2.1 Issues Identified

| Screen  | Issue                                                                 |
| ------- | --------------------------------------------------------------------- |
| Coding  | Single-column layout cramped; problem/invariants compete with editor  |
| Coding  | Button placement confusing (REC, Nudge, Submit, Pause, Abandon)       |
| Prep    | Similar button placement issues                                       |
| Summary | Card pattern doesn't fit heavy content (metrics, problem, invariants) |
| Timer   | Shows 00:00 on submit instead of actual time remaining                |

### 3.2.2 Proposed Layouts

**Coding Screen (Two-Column):**
```
┌─────────────────────────────────────────────────────────────────────┐
│  [CODING] 28:15        [⏸ Pause] [Submit Solution]                  │
├─────────────────────────────────────────────────────────────────────┤
│                                    │                                │
│                                    │  ▼ Problem: Two Sum            │
│      CODE EDITOR                   │    Given an array of...        │
│      (~60% width)                  ├────────────────────────────────│
│                                    │  ▼ Your Invariants             │
│                                    │    - Array not sorted          │
│                                    ├────────────────────────────────│
│                                    │  [Nudge (2/3)]                 │
├─────────────────────────────────────────────────────────────────────┤
│  [🔴 REC]                                         [Abandon Session] │
└─────────────────────────────────────────────────────────────────────┘
```

**Prep Screen (Two-Column):**
```
┌─────────────────────────────────────────────────────────────────────┐
│  [PREP] 04:32                      [⏸ Pause] [Start Coding →]       │
├─────────────────────────────────────────────────────────────────────┤
│                                    │                                │
│      INVARIANTS TEXTAREA           │  Problem: Two Sum              │
│      (primary focus, ~60%)         │  Given an array of integers... │
│                                    │                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                   [Abandon Session] │
└─────────────────────────────────────────────────────────────────────┘
```

**Summary Screen (Sections, not cards):**
```
┌─────────────────────────────────────────────────────────────────────┐
│  [SUMMARY]                                                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                             │
│  │  28:15  │  │   2/3   │  │ Two Sum │                             │
│  │  TIME   │  │ NUDGES  │  │ PROBLEM │                             │
│  └─────────┘  └─────────┘  └─────────┘                             │
│                                                                     │
│  ▼ Problem Description                                              │
│  ▼ Your Invariants                                                  │
│  ▼ Your Solution                                                    │
│                                                                     │
│                    [Continue to Reflection]                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2.3 Implementation Chunks

| Chunk | Scope                              | Estimate |
| ----- | ---------------------------------- | -------- |
| 1     | `CollapsibleSection` component     | ~30 min  |
| 2     | Coding screen two-column + footer  | ~1.5 hrs |
| 3     | Prep screen layout update          | ~45 min  |
| 4     | Summary screen sections layout     | ~1 hr    |
| 5     | Timer behavior on submit           | ~15 min  |
| 6     | Polish & E2E review                | ~30 min  |
| **Total** |                              | **~5 hrs** |

### 3.2.4 Checkpoint

- [ ] Chunk 1: `CollapsibleSection` component
- [ ] Chunk 2: Coding screen two-column layout
- [ ] Chunk 3: Prep screen layout update
- [ ] Chunk 4: Summary screen sections layout
- [ ] Chunk 5: Timer shows actual time remaining on submit
- [ ] Chunk 6: E2E tests pass, responsive breakpoints work
- [ ] Commit after each chunk for incremental review

---

## Phase 4: Pre-Session Mic Check

**Goal**: Add microphone check before starting a session

### 4.1 Flow

1. User clicks "Start Session"
2. If `audioSupported`, show mic check inline (not modal)
3. Requests microphone permission
4. Shows real-time audio level visualization
5. User confirms mic works → session starts with recording
6. Or user clicks "Continue Without Recording" → session starts without audio

### 4.2 Why It Will Work Now

With the reactive framework:

- `onMount` cleanup prevents audio analyzer leaks
- State changes don't destroy/recreate the entire DOM
- Event handlers survive re-renders
- `signal` updates audio level meter smoothly

### 4.3 Checkpoint

- [ ] Mic check inline component implemented
- [ ] Audio level visualization works
- [ ] Commit: `feat(web): add pre-session mic check`

---

## Phase 5: Core Engine - Missing Metrics + Tests

**Goal**: Implement the missing behavioral signals and complete all 42 todo tests

### 5.1 New Metrics

```typescript
codeChanges: number;           // Total code change events
codeChangesInSilent: number;   // Code changes during SILENT
codeChangedInSilent: boolean;  // Whether any code changed in SILENT
nudgeTiming: NudgeTiming[];    // 'early' | 'mid' | 'late'
```

### 5.2 Test Categories

- `recovery.test.ts` (~9 todos): Restore from events, abandonment
- `phases.test.ts` (~33 todos): Phase-specific behaviors

### 5.3 Checkpoint

- [ ] All 42 TODO tests pass
- [ ] Commit: `feat(core): add behavioral metrics (code changes, nudge timing)`

---

## Estimated Time

| Phase                             | Estimate    | Status       |
| --------------------------------- | ----------- | ------------ |
| Phase 0 (Bug Fixes)               | -           | ✅ Done      |
| Phase 1 (Framework)               | ~4-6 hours  | ✅ Done      |
| Phase 2 (Fresh UI + Neobrutalism) | ~8-13 hours | ✅ Done      |
| Phase 3 (Dashboard + UI Polish)   | ~15 hours   | ✅ ~90% Done |
| Phase 3.1 (Audio Bug Fix)         | ~2 hours    | ✅ Done      |
| Phase 3.2 (UX Improvements)       | ~5 hours    | 🔜 Next      |
| Phase 4 (Mic Check)               | ~2-3 hours  | Pending      |
| Phase 5 (Core Engine)             | ~2-3 hours  | Pending      |

**Total Remaining: ~10-11 hours** (Phase 3.2 + Phase 4 + Phase 5)
