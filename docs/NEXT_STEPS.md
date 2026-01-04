# Next Steps

## Overview

Work planned in priority order:

1. **Phase 0: Bug Fixes** - Fix export bug ✅ DONE
2. **Phase 1: Reactive Framework** - Build minimal reactive UI framework ✅ DONE (131 tests)
3. **Phase 2: Fresh UI + Neobrutalism** - Delete old UI, write fresh reactive components with neobrutalism design ✅ DONE
4. **Phase 3: Dashboard + UI Polish** - Dashboard, simplified routing, two-column coding, auto-recording, pause/resume 🔜 NEXT
5. **Phase 4: Mic Check** - Pre-session microphone check with audio level visualization
6. **Phase 5: Core Engine** - Add missing behavioral metrics + complete 42 todo tests

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

## Phase 3: Dashboard + UI Polish 🔜 NEXT

**Goal**: Add dashboard for session management, simplify routing, improve coding screen layout, add pause/resume and auto-recording

**Estimated Time**: ~15 hours

### 3.1 Route Structure (Simplified)

| Route         | Screen            | Description                                       |
| ------------- | ----------------- | ------------------------------------------------- |
| `/#/`         | DashboardScreen   | Session list, stats, "New Session" button         |
| `/#/new`      | NewSessionScreen  | Preset selection                                  |
| `/#/:id`      | SessionScreen     | Active session (renders current phase internally) |
| `/#/:id/view` | SessionViewScreen | Read-only view of completed session               |

**Key Principle**: Each route must be directly navigable. Phase is state, not route.

### 3.2 New Screens

| Screen                 | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `DashboardScreen.ts`   | Landing page with session list and aggregate stats |
| `NewSessionScreen.ts`  | Preset selection (extracted from HomeScreen)       |
| `SessionScreen.ts`     | Container that renders appropriate phase component |
| `SessionViewScreen.ts` | Read-only view of completed/abandoned session      |

### 3.3 Phase Components (Refactored)

Screens renamed to phase components (children of SessionScreen):

| Component            | Purpose                                      |
| -------------------- | -------------------------------------------- |
| `PrepPhase.ts`       | Prep phase UI                                |
| `CodingPhase.ts`     | Coding + Silent phase UI (two-column layout) |
| `SummaryPhase.ts`    | Summary phase UI                             |
| `ReflectionPhase.ts` | Reflection phase UI                          |
| `DonePhase.ts`       | Done phase UI with link to View              |

### 3.4 New Components

| Component               | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `AppHeader.ts`          | Global header with clickable title + "← Dashboard" link |
| `StatsCard.ts`          | Dashboard stat display (value + label)                  |
| `SessionCard.ts`        | Session row in list (title, status, actions)            |
| `CollapsibleSection.ts` | Expandable section for mobile coding layout             |
| `MicStatusIndicator.ts` | Shows mic state (recording/ready/blocked/unsupported)   |

### 3.5 Store Changes

**New State:**

```typescript
isPaused: boolean;
```

**New Actions:**

```typescript
pauseSession(): void;           // Pause timer + recording
resumeSession(): void;          // Resume timer + recording
softDeleteSession(id: string): Promise<void>;
getSessionStats(): { total: number; avgNudges: number; avgPrepTimeMs: number };
```

**Modified Actions:**

- `startCoding()` - Auto-start recording if `audioSupported`
- `submitSolution()` - Auto-stop recording
- `handlePhaseExpiry()` (SILENT→SUMMARY) - Auto-stop recording
- `abandonSession()` - Auto-stop recording

### 3.6 Storage Changes

**New Field:**

```typescript
interface StoredSession {
  // ... existing
  deletedAt: number | null;  // Soft delete timestamp
}
```

**Modified Methods:**

- `getAllSessions()` - Filter out deleted sessions
- `getIncompleteSession()` - Filter out deleted sessions

**New Methods:**

- `softDeleteSession(id: string)` - Set `deletedAt = Date.now()`

### 3.7 Coding Screen Layout (Two-Column)

**Desktop (≥768px):**

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Dashboard          Interview Conditioning Studio             │
├─────────────────────────────────────────────────────────────────┤
│  [CODING] [28:15] [⏸ Pause] [Submit Solution]   [(ghost) Abandon]│
├───────────────────────────────────┬─────────────────────────────┤
│                                   │ [SILENT BANNER if silent]   │
│                                   ├─────────────────────────────┤
│                                   │ ▼ Problem: Two Sum          │
│   CODE EDITOR                     │   Given an array of...      │
│   (primary focus, ~65%)           ├─────────────────────────────┤
│                                   │ ▼ Your Invariants           │
│                                   │   - Array not sorted        │
│                                   ├─────────────────────────────┤
│                                   │ [Nudge (2/3)]               │
├───────────────────────────────────┴─────────────────────────────┤
│  [🔴 REC] or [⚠️ MIC BLOCKED] or [🚫 NO MIC]                    │
└─────────────────────────────────────────────────────────────────┘
```

**Mobile (<768px):** Stacked layout with collapsible Problem/Invariants sections.

### 3.8 Dashboard Features

- Aggregate stats (total sessions, avg nudges, avg prep time)
- Session list with client-side pagination (10 per page)
- Per-session actions:
  - In Progress: Resume, Delete
  - Completed/Abandoned: View, Export, Delete
- Educational empty state for new users

### 3.9 Edge Cases & Decisions

#### Must Handle (20 items)

| #   | Edge Case                          | Decision                                | E2E Test File         |
| --- | ---------------------------------- | --------------------------------------- | --------------------- |
| 1   | Pause behavior                     | Pauses timer AND recording              | `pause.spec.ts`       |
| 2   | Pause in Silent phase              | Allow                                   | `pause.spec.ts`       |
| 3   | Auto-record permission denied      | Show `MicStatusIndicator` blocked state | `audio.spec.ts`       |
| 4   | Resume session + recording         | Auto-restart recording                  | `pause.spec.ts`       |
| 5   | Dashboard nav with active session  | Warn but allow, auto-save               | `dashboard.spec.ts`   |
| 6   | Abandoned sessions                 | Soft delete, hidden from UI             | `dashboard.spec.ts`   |
| 7   | New session while one active       | Block with message                      | `dashboard.spec.ts`   |
| 8   | Browser back button                | Allow, session auto-saved               | `persistence.spec.ts` |
| 9   | Empty stats calculation            | Return zeros (no division error)        | `dashboard.spec.ts`   |
| 10  | Export with no audio               | Omit audio file from export             | `export.spec.ts`      |
| 11  | Export abandoned session           | Allow                                   | `export.spec.ts`      |
| 12  | Export in-progress session         | Disallow                                | `export.spec.ts`      |
| 13  | Timer drift across pause/resume    | Track `totalPausedMs` from timestamps   | `pause.spec.ts`       |
| 14  | Session restore with expired timer | Auto-advance phase                      | `persistence.spec.ts` |
| 15  | Direct URL to non-existent session | Redirect to Dashboard + toast           | `dashboard.spec.ts`   |
| 16  | Direct URL to deleted session      | Redirect to Dashboard + toast           | `dashboard.spec.ts`   |
| 17  | Rapid pause/resume                 | Debounce 300ms                          | `pause.spec.ts`       |
| 18  | Rapid code changes                 | Debounce storage saves (500ms)          | `persistence.spec.ts` |
| 19  | Refresh during session             | Restore from storage                    | `persistence.spec.ts` |
| 20  | Dispatch event during pause        | Allow non-timer events                  | `pause.spec.ts`       |

#### Deferred (15 items)

| #   | Edge Case                     | Decision                  | Reason Deferred         |
| --- | ----------------------------- | ------------------------- | ----------------------- |
| 21  | Multiple browser tabs         | Defer                     | Complex, rare use case  |
| 22  | Session deleted while viewing | Defer                     | Complex, rare use case  |
| 23  | Very long recordings (50MB+)  | Defer                     | Already compressed      |
| 24  | IndexedDB unavailable         | Toast + continue          | Rare (private browsing) |
| 25  | Recording fails mid-session   | Toast + indicator         | Hard to simulate in E2E |
| 26  | System sleep / laptop lid     | Recalculate on visibility | Hard to test in E2E     |
| 27  | Pause at phase expiry         | Pause takes precedence    | Timing-sensitive        |
| 28  | Storage quota exceeded        | Toast, don't crash        | Hard to test            |
| 29  | Export download blocked       | Toast on failure          | Browser-specific        |
| 30  | Same problem twice            | Defer                     | UX annoyance only       |
| 31  | Mobile keyboard covers input  | Defer                     | Browser handles         |
| 32  | Screen reader timer           | Defer                     | a11y enhancement        |
| 33  | System clock change           | Defer                     | Very rare               |
| 34  | Orphaned audio data           | Best effort               | Future cleanup          |
| 35  | Reflection form autofill      | `autocomplete="off"`      | Minor UX                |

### 3.10 E2E Test Plan

| Test File                          | New Tests | Edge Cases Covered        |
| ---------------------------------- | --------- | ------------------------- |
| `e2e/dashboard.spec.ts` (new)      | 8         | #5, #6, #7, #9, #15, #16  |
| `e2e/pause.spec.ts` (new)          | 11        | #1, #2, #4, #13, #17, #20 |
| `e2e/persistence.spec.ts` (update) | 5         | #8, #14, #18, #19         |
| `e2e/export.spec.ts` (update)      | 3         | #10, #11, #12             |
| `e2e/audio.spec.ts` (update)       | 2         | #3                        |
| **Total**                          | **~29**   |                           |

### 3.11 Checkpoint

- [ ] E2E: Create `dashboard.spec.ts` (8 tests, `.skip`)
- [ ] E2E: Create `pause.spec.ts` (11 tests, `.skip`)
- [ ] E2E: Update `persistence.spec.ts` (5 tests, `.skip`)
- [ ] E2E: Update `export.spec.ts` (3 tests, `.skip`)
- [ ] E2E: Update `audio.spec.ts` (2 tests, `.skip`)
- [ ] Storage: Add `deletedAt`, soft delete, filter logic
- [ ] Store: Add `isPaused`, pause/resume actions
- [ ] Store: Add auto-recording in `startCoding()`, auto-stop
- [ ] Store: Add `getSessionStats()`, `softDeleteSession()`
- [ ] Components: Create `MicStatusIndicator`, `AppHeader`, `CollapsibleSection`
- [ ] Components: Create `StatsCard`, `SessionCard`
- [ ] Components: Modify `PhaseHeader` (pause), `Timer` (paused), `Button` (ghost)
- [ ] Phases: Create all phase components in `web/src/phases/`
- [ ] Screens: Create `DashboardScreen`, `NewSessionScreen`, `SessionScreen`, `SessionViewScreen`
- [ ] Router: Update `main.ts` for new routes
- [ ] CSS: Add all new styles
- [ ] Delete old screen files, `RecordingIndicator.ts`
- [ ] E2E: Unskip all tests, verify passing
- [ ] Commit: `feat(web): add dashboard, simplified routing, UI polish`

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

| Phase                             | Estimate    | Status  |
| --------------------------------- | ----------- | ------- |
| Phase 0 (Bug Fixes)               | -           | ✅ Done |
| Phase 1 (Framework)               | ~4-6 hours  | ✅ Done |
| Phase 2 (Fresh UI + Neobrutalism) | ~8-13 hours | ✅ Done |
| Phase 3 (Dashboard + UI Polish)   | ~15 hours   | 🔜 Next |
| Phase 4 (Mic Check)               | ~2-3 hours  | Pending |
| Phase 5 (Core Engine)             | ~2-3 hours  | Pending |

**Total Remaining: ~20-21 hours**
