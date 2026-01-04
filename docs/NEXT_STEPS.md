# Next Steps

## Overview

Work planned in priority order:

1. **Phase 0: Bug Fixes** - Fix export bug ✅ DONE
2. **Phase 1: Reactive Framework** - Build minimal reactive UI framework ✅ DONE (131 tests)
3. **Phase 2: Migrate App** - Rewrite screens using new framework
4. **Phase 3: Dashboard** - Session management landing page with pagination and stats
5. **Phase 4: Mic Check** - Pre-session microphone check (deferred, requires framework)
6. **Phase 5: Core Engine** - Add missing behavioral metrics + complete todo tests
7. **Phase 6: UI Redesign** - Apply neobrutalism design language

## Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Development approach | TDD | Write tests first, then implementation |
| Signal API | Tuple: `[get, set] = signal(0)` | Familiar, explicit read/write |
| Modals | **Removed entirely** | Use two-click inline pattern instead |
| Debug view | **Removed** | Use `window.IDS` API for debugging |
| CSS location | Keep in `web/css/styles.css` | No runtime style injection (defer component styles) |
| Timer logic | Lives in AppStore | Global behavior, not component-specific |
| Helpers | Module-scoped, no OOP | Timer, audio, storage as factory functions coordinated by store |
| Utilities | Shared `web/src/utils.ts` | Reduce duplication of `escapeHtml` etc. |
| `getAppState()` return | Live session object | E2E tests depend on `session.dispatch()` |
| Router | Replace entirely | New framework router replaces `web/src/router.ts` |

## Two-Click Inline Pattern (Replaces Modals)

For destructive actions like "Discard session":

1. **First click**: Button changes to "Confirm?" (red styling)
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

**Added**: Comprehensive export tests that actually verify tar.gz contents:

- `code.txt` contains actual code written
- `invariants.txt` contains actual invariants written
- `session.json` has correct structure and reflection data
- Export contains exactly 3 files when no audio
- Empty code/invariants export as empty strings

---

## Phase 1: Reactive Framework Core ✅ DONE

**Goal**: Build a minimal reactive UI framework to replace string templates

**Status**: Complete - 131 unit tests passing

### 1.1 Files Created

```
web/src/framework/
├── reactive.ts     # signal, derived, watch, batch (70 lines)
├── elements.ts     # h, div, span, Show, For (150 lines)
├── component.ts    # mount, onMount, onCleanup, context (100 lines)
├── store.ts        # createStore, useStore, useActions (55 lines)
├── router.ts       # createRouter, useRouter, useRoute, Link (170 lines)
└── index.ts        # public exports (75 lines)

tests/framework/
├── reactive.test.ts   # 13 tests
├── elements.test.ts   # 51 tests
├── component.test.ts  # 19 tests
├── store.test.ts      # 13 tests
└── router.test.ts     # 35 tests
```

### 1.2 API Summary

```typescript
// Reactive primitives
const [count, setCount] = signal(0);
const doubled = derived(() => count() * 2);
const cleanup = watch(() => console.log(count()));
batch(() => { setCount(1); setCount(2); });

// Elements
div({ class: "foo", onClick: handler }, [children]);
Show(() => condition(), () => whenTrue(), () => whenFalse());
For(() => items(), (item, index) => div({}, [item.name]));

// Components
const unmount = mount(Component, container);
onMount(() => { /* setup */ return () => { /* cleanup */ }; });
onCleanup(() => { /* cleanup */ });
const ThemeCtx = createContext("light");
const theme = useContext(ThemeCtx);

// Store
const Store = createStore({
  state: { count: 0 },
  actions: (set, get) => ({
    increment: () => set({ count: get().count + 1 })
  })
});
const { count } = useStore(Store);
const { increment } = useActions(Store);
Store.getSnapshot();

// Router
const Router = createRouter([
  { path: "/", component: Home },
  { path: "/user/:id", component: UserDetail },
], { fallback: NotFound });
const { navigate, back } = useRouter();
const { path, params } = useRoute();
Link({ href: "/about" }, ["About"]);
```

### 1.3 Checkpoint ✅

- [x] All framework modules implemented
- [x] Unit tests pass for each module (131 total)
- [x] Can mount a simple component with reactive state
- [x] Router navigates between test components
- [x] Commit: `feat(web): add reactive UI framework core`

---

## Phase 2: Migrate App to Framework

**Goal**: Rewrite all screens/components using the new framework, delete old code

**Strategy**: Screen-by-screen migration with E2E validation checkpoints. Use Playwright MCP for interactive testing during migration.

### 2.1 Architecture: Module-Scoped Helpers

Timer, audio, and storage follow the same pattern - factory functions that return control objects, coordinated by the store:

```typescript
// web/src/timer.ts
export function createTimer(callbacks: {
  onTick: () => void;
  onExpire: () => void;
}): Timer {
  return { start, stop, pause, resume };
}

// web/src/audio.ts (refactored)
export function createRecorder(callbacks: {
  onChunk: (chunk: Blob) => void;
  onError: (error: Error) => void;
}): Recorder {
  return { start, stop, isSupported };
}

// web/src/storage.ts (refactored)
export function createStorage(): Storage {
  return { saveSession, loadSession, deleteSession, getIncompleteSessions };
}
```

Store coordinates these at module level (no OOP, just closures):

```typescript
// web/src/store.ts
const timer = createTimer({
  onTick: () => set({ remainingTime: calculateRemaining() }),
  onExpire: () => actions.handlePhaseExpiry(),
});

const recorder = createRecorder({
  onChunk: (chunk) => { /* save to storage */ },
  onError: (err) => set({ audioError: err.message }),
});

const storage = createStorage();

export const AppStore = createStore({
  state: { /* ... */ },
  actions: (set, get) => ({
    startCoding: () => {
      timer.start(get().config.codingDuration);
      recorder.start();
      storage.saveSession(get().session);
    },
    // ...
  }),
});
```

### 2.2 E2E Validation Strategy

Validate each screen incrementally using subset of E2E tests:

| Screen | E2E Tests to Run | Key Validations |
|--------|------------------|-----------------|
| HomeScreen | `smoke.spec.ts`, `modals.spec.ts` | Title, presets, resume banner |
| PrepScreen | `responsive.spec.ts` (subset) | Problem display, invariants input |
| CodingScreen | `audio.spec.ts` | Editor, nudge, submit, recording UI |
| SilentScreen | **New: `silent.spec.ts`** | Silent banner, no nudge button |
| SummaryScreen | `early-submission.spec.ts` (subset) | Stats display, continue button |
| ReflectionScreen | **New: `reflection.spec.ts`** | Radio buttons, form submission |
| DoneScreen | `export.spec.ts` | Export button, download, new session |

**New E2E tests to create during migration:**
- `e2e/silent.spec.ts` - Silent phase specific tests
- `e2e/reflection.spec.ts` - Reflection form tests

After all screens: Run full E2E suite (88 tests)

### 2.3 Two-Click Confirmation UX

Replaces modals for destructive actions (e.g., "Discard Session"):

```
[Discard]  →  click  →  [Confirm?]  →  click  →  action executes
                            ↓
                     (3s timeout or click elsewhere)
                            ↓
                        [Discard] (resets)
```

Implementation:
- Button has local `confirming` state
- First click: set `confirming = true`, change text/style
- Second click: execute action, reset state
- `setTimeout(3000)` or blur: reset state
- CSS: `.btn--confirming { background: var(--color-danger); }`

### 2.4 E2E Test Contract

The following must be maintained for E2E tests to pass:

**CSS Selectors:**

| Type | Examples |
|------|----------|
| Classes | `.start-button`, `.start-coding-button`, `.resume-banner`, `.resume-banner__title`, `.toast`, `.timer`, `.btn--primary` |
| IDs | `#invariants`, `#code`, `#app`, `#toast-container` |
| Data attrs | `[data-action="start-session"]`, `[data-action="submit-solution"]`, `[data-action="resume-session"]`, `[data-action="discard-session"]`, `[data-component="timer"]` |
| Form inputs | `input[name="clearApproach"][value="yes"]`, etc. |

**Note:** Modal selectors (`.modal`, `.modal-backdrop`, `[data-action="modal-confirm"]`) are **removed** - replaced by two-click inline pattern.

**window.IDS API:**

```typescript
window.IDS = {
  getAppState(),  // Returns live session object for E2E test compatibility
  startSession(), abandonSession(), resetApp(),
  updateInvariants(), startCoding(), updateCode(),
  requestNudge(), submitSolution(), continuePastSummary(),
  submitReflection(),
  storage: { clearAll(), getStats(), getSession(), getIncompleteSession(), getAllSessions() },
  router: { getCurrentRoute() },
};
```

### 2.5 Migration Order with Checkpoints

| Step | Task | Test Checkpoint |
|------|------|-----------------|
| 1 | Create `timer.ts` helper | Unit tests |
| 2 | Refactor `audio.ts` to factory pattern | Unit tests |
| 3 | Refactor `storage.ts` to factory pattern | Unit tests |
| 4 | Create `AppStore` | Unit tests |
| 5 | Migrate shared components (Button, Timer, Toast, etc.) | Manual |
| 6 | Migrate HomeScreen | `smoke.spec.ts`, `modals.spec.ts` |
| 7 | Migrate PrepScreen | `responsive.spec.ts` |
| 8 | Migrate CodingScreen | `audio.spec.ts` |
| 9 | Create `silent.spec.ts`, migrate SilentScreen | `silent.spec.ts` |
| 10 | Migrate SummaryScreen | `early-submission.spec.ts` |
| 11 | Create `reflection.spec.ts`, migrate ReflectionScreen | `reflection.spec.ts` |
| 12 | Migrate DoneScreen | `export.spec.ts` |
| 13 | Wire router + window.IDS | `routing.spec.ts` |
| 14 | Rewrite `modals.spec.ts` for two-click pattern | `modals.spec.ts` |
| 15 | Full validation | All 88+ E2E tests |
| 16 | Delete old files | - |

### 2.6 Component Migration Order

**Shared components (simplest to most complex):**

1. `Button` - stateless, just props
2. `Timer` - reactive `remainingMs` prop
3. `PhaseHeader` - composes Timer
4. `PresetCard` - click handler via props
5. `InvariantsDisplay` - display only
6. `InvariantsInput` - controlled input
7. `CodeEditor` - controlled textarea + Tab handling
8. `NudgeButton` - disabled state
9. `RecordingIndicator` - active state
10. `ProblemCard` - collapsible local state
11. `Toast` - manager pattern (similar to current)
12. `ConfirmButton` - two-click inline pattern (replaces Modal)

**Screens (simplest to most complex):**

1. `DoneScreen` - static, 2 buttons
2. `SummaryScreen` - static display
3. `HomeScreen` - preset selection, resume banner with two-click discard
4. `PrepScreen` - timer, form input
5. `ReflectionScreen` - form with radio buttons
6. `CodingScreen` - timer, editor, recording, nudges

### 2.7 Files to Delete After Migration

| File | Reason |
|------|--------|
| `web/src/app.ts` | Replaced by store + components |
| `web/src/router.ts` | Replaced by framework router |
| `web/src/modals/index.ts` | Removed - using two-click inline pattern |
| `web/src/components/Modal.ts` | Removed - using two-click inline pattern |
| `web/src/screens/*.ts` (old) | Replaced by new implementations |
| `web/src/components/*.ts` (old) | Replaced by new implementations |

### 2.8 Example Migration: Button

**Before (string template):**

```typescript
export function render(props: ButtonProps): string {
  const { label, variant = "primary", disabled, action } = props;
  return `
    <button 
      class="btn btn--${variant}" 
      data-action="${action}"
      ${disabled ? "disabled" : ""}
    >${escapeHtml(label)}</button>
  `;
}
```

**After (framework component):**

```typescript
export function Button(props: ButtonProps) {
  const { label, variant = "primary", disabled, action, onClick } = props;
  
  return button({
    class: `btn btn--${variant}`,
    "data-action": action,
    disabled,
    onClick,
  }, [label]);
}
```

### 2.9 Checkpoint

- [ ] Helper modules created (timer, audio, storage)
- [ ] App store created with all state/actions
- [ ] All shared components migrated
- [ ] All screens migrated
- [ ] New E2E tests created (`silent.spec.ts`, `reflection.spec.ts`)
- [ ] Router wired up
- [ ] window.IDS API works
- [ ] `e2e/modals.spec.ts` rewritten for two-click pattern
- [ ] All E2E tests pass
- [ ] Old files deleted
- [ ] Commit: `refactor(web): migrate to reactive framework`

---

## Phase 3: Dashboard + Session Management

**Goal**: Add a dashboard as the landing page for session management

### 3.1 Route Structure

| Route | Screen | Description |
|-------|--------|-------------|
| `/#/` | Dashboard | List sessions, stats, start new |
| `/#/new` | NewSessionScreen | Select preset/problem (current Home) |
| `/#/:id/prep` | PrepScreen | Prep phase |
| `/#/:id/coding` | CodingScreen | Coding phase |
| `/#/:id/silent` | CodingScreen | Silent phase (same screen, silent mode) |
| `/#/:id/summary` | SummaryScreen | Summary phase |
| `/#/:id/reflection` | ReflectionScreen | Reflection phase |
| `/#/:id/done` | DoneScreen | Completion screen |

### 3.2 Dashboard Screen

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Interview Conditioning Studio                              │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Stats Bar:                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │ 12      │ │ 2.1     │ │ 3:42    │ │ 4       │           │
│  │Sessions │ │Avg Nudge│ │Avg Prep │ │This Week│           │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│  [+ Start New Session]                                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Sessions                                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Two Sum        │ Completed │ Jan 3  │ [Export] [Delete] │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Merge Lists    │ In Progress │ Jan 3 │ [Resume] [Delete] │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Prev]  Page 1 of 3  [Next]                               │
└─────────────────────────────────────────────────────────────┘
```

**Features:**

- Aggregate stats (total sessions, avg nudges, avg prep time, this week)
- Session list with pagination (10 per page)
- Per-session actions: Resume, Export, Delete

### 3.3 Soft Delete Implementation

```typescript
interface StoredSession {
  // ... existing fields
  deletedAt?: number | null; // Timestamp when soft-deleted
}
```

- `softDeleteSession(id)` - Sets deletedAt
- `restoreSession(id)` - Clears deletedAt
- `getAllSessions()` - Excludes soft-deleted
- No automatic expiry (keep indefinitely for now)

### 3.4 Checkpoint

- [ ] Dashboard screen implemented
- [ ] Session list with pagination
- [ ] Soft delete working
- [ ] E2E tests for dashboard (`e2e/dashboard.spec.ts`)
- [ ] Commit: `feat(web): add dashboard with session management`

---

## Phase 4: Pre-Session Mic Check

**Goal**: Add microphone check before starting a session

**Why deferred**: Requires proper component lifecycle management from the framework. The previous attempt failed because the modal system destroyed event handlers on re-render.

### 4.1 Mic Check Screen/Inline Component

**Flow:**

1. User clicks "Start Session"
2. If `audioSupported`, show mic check inline (not modal)
3. Requests microphone permission
4. Shows real-time audio level visualization
5. User confirms mic works → session starts with recording
6. Or user clicks "Continue Without Recording" → session starts without audio

**States:**

- **Requesting**: "Requesting microphone access..."
- **Denied**: "Microphone access denied. You can still practice without recording."
- **No Audio**: "No audio detected. Check your microphone settings."
- **Working**: "Microphone working" (green, audio meter active)

### 4.2 Audio Level Monitoring

Add to `web/src/audio.ts`:

```typescript
const getAudioLevel = (): number => {
  if (!analyser) return 0;

  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  const sum = dataArray.reduce((a, b) => a + b, 0);
  return sum / (dataArray.length * 255); // 0-1
};
```

### 4.3 Why It Will Work Now

With the reactive framework:

- `onMount` cleanup prevents audio analyzer leaks
- State changes don't destroy/recreate the entire DOM
- Event handlers survive re-renders
- `signal` updates audio level meter smoothly at 60fps

### 4.4 Checkpoint

- [ ] Mic check inline component implemented
- [ ] Audio level visualization works
- [ ] Audio saves correctly across multiple sessions
- [ ] Commit: `feat(web): add pre-session mic check`

---

## Phase 5: Core Engine - Missing Metrics + Tests

**Goal**: Implement the missing behavioral signals and complete all 42 todo tests

### 5.1 New Metrics

Add to `SessionState`:

```typescript
codeChanges: number;           // Total code change events
codeChangesInSilent: number;   // Code changes during SILENT
codeChangedInSilent: boolean;  // Whether any code changed in SILENT
nudgeTiming: NudgeTiming[];    // When each nudge was used ('early' | 'mid' | 'late')
```

### 5.2 Test Categories

**`recovery.test.ts`** (~9 todos):

- Restore session state from events
- Explicit abandonment handling
- State preservation after recovery

**`phases.test.ts`** (~33 todos):

- PREP: invariants handling, nudges not allowed
- CODING: code tracking, nudge timing classification
- SILENT: code changes tracking, nudges disabled
- REFLECTION: response capture, validation, completion

### 5.3 Checkpoint

- [ ] All 42 TODO tests pass
- [ ] Commit: `feat(core): add behavioral metrics (code changes, nudge timing)`

---

## Phase 6: Neobrutalism CSS Redesign

**Goal**: Apply bold, high-contrast neobrutalism design language

### 6.1 Key Characteristics

- Heavy black borders (2-3px)
- Offset box shadows (4px 4px 0 0 black)
- Bright/bold colors, high contrast
- Small rounded corners (~5px)
- Hover: translate + shadow disappears
- Bold typography (800 headings, 500 body)
- No gradients, no blur

### 6.2 Why It Fits

- "Uncomfortable" aesthetic matches product principle
- High contrast aids focus during timed sessions
- Distinctive look - not a "friendly" learning app

### 6.3 Checkpoint

- [ ] CSS variables updated
- [ ] All components styled
- [ ] Visual QA at all viewports
- [ ] E2E tests still pass
- [ ] Commit: `style(web): apply neobrutalism design language`

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Development approach | TDD | Write tests first, then implementation |
| Framework first | Build before mic check | Can't fix lifecycle issues without it |
| Migration strategy | Screen-by-screen with E2E checkpoints | Validate incrementally, catch issues early |
| Helpers pattern | Module-scoped factories, no OOP | Simple closures, store coordinates |
| Modals | Removed entirely | Two-click inline pattern is simpler |
| Debug view | Removed | Use `window.IDS` for debugging |
| Naming convention | Unified kebab/camelCase | Consistency across codebase |
| CSS approach | Keep in `styles.css` for now | Defer component-scoped styles to later phase |
| Timer logic | In AppStore via helper | Global behavior, store coordinates |
| `getAppState()` | Returns live session | E2E tests use `session.dispatch()` |
| Two-click confirmation | Button text change + 3s timeout | Clear, no complex modal lifecycle |
| Soft delete expiry | None (keep indefinitely) | Wait to see if it becomes an issue |
| Dashboard stats | 4 metrics | Total, avg nudges, avg prep, this week |
| Pagination | 10 per page | Reasonable default |
| Route for new session | `/#/new` | Clear separation from dashboard |
| Theme | Light (default) | Standard for neobrutalism, high contrast |
| Fonts | System fonts | Zero load time, local-first philosophy |
| Test directory | Consolidated `tests/` | Simpler `bun test` without path args |

---

## Estimated Time

| Phase | Estimate |
|-------|----------|
| Phase 1 (Framework) | ~4-6 hours |
| Phase 2 (Migration) | ~4-6 hours |
| Phase 3 (Dashboard) | ~3-4 hours |
| Phase 4 (Mic Check) | ~2-3 hours |
| Phase 5 (Core Engine) | ~2-3 hours |
| Phase 6 (Neobrutalism CSS) | ~3-4 hours |

**Total: ~18-26 hours**
