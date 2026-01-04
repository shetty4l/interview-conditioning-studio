# Next Steps

## Overview

Work planned in priority order:

1. **Phase 0: Bug Fixes** - Fix export bug ✅ DONE
2. **Phase 1: Reactive Framework** - Build minimal reactive UI framework (~400 lines)
3. **Phase 2: Migrate App** - Rewrite screens using new framework
4. **Phase 3: Dashboard** - Session management landing page with pagination and stats
5. **Phase 4: Mic Check** - Pre-session microphone check (deferred, requires framework)
6. **Phase 5: Core Engine** - Add missing behavioral metrics + complete todo tests
7. **Phase 6: UI Redesign** - Apply neobrutalism design language

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

## Phase 1: Reactive Framework Core

**Goal**: Build a minimal (~400 line) reactive UI framework to replace string templates

**Why**: The current `app.ts` is 1007 lines of intertwined state management. The modal system destroys/recreates handlers on every state change, making features like mic check impossible to implement correctly. A proper reactive framework with lifecycle management is needed first.

### 1.1 Files to Create

```
web/src/framework/
├── reactive.ts     # signal, derived, watch (~100 lines)
├── elements.ts     # h, div, span, Show, For (~100 lines)
├── component.ts    # mount, onMount, onCleanup (~80 lines)
├── router.ts       # createRouter, useRouter, Link (~80 lines)
├── store.ts        # createStore, useStore (~50 lines)
└── index.ts        # public exports
```

### 1.2 Reactive Primitives (`reactive.ts`)

```typescript
// Signal - reactive state container
const [count, setCount] = signal(0);
count(); // read: 0
setCount(1); // write
setCount((prev) => prev + 1); // update function

// Derived - computed values that auto-update
const doubled = derived(() => count() * 2);
doubled(); // always 2x count

// Watch - side effects that run when dependencies change
const cleanup = watch(() => {
  console.log("Count is:", count());
});
cleanup(); // stop watching
```

### 1.3 Element Helpers (`elements.ts`)

```typescript
// Create elements with props and children
div({ class: "container", onClick: handler }, [
  h1("Title"),
  p({ class: "text-muted" }, "Description"),
  Button({ label: "Click me" }),
]);

// Conditional rendering
Show(
  () => isVisible(),
  () => span("Visible!"),
  () => span("Hidden")
);

// List rendering with keyed updates
For(
  () => items(),
  (item, index) => div({ key: item.id }, item.name)
);
```

### 1.4 Component Lifecycle (`component.ts`)

```typescript
function MyComponent(props) {
  const [local, setLocal] = signal(0);

  // Runs after mount, return cleanup function
  onMount(() => {
    const interval = setInterval(() => setLocal((n) => n + 1), 1000);
    return () => clearInterval(interval); // cleanup on unmount
  });

  // Explicit cleanup registration
  onCleanup(() => {
    console.log("Component unmounting");
  });

  return div({ class: "my-component" }, [span(() => `Count: ${local()}`)]);
}

// Mount to DOM
const unmount = mount(MyComponent, document.getElementById("app")!);
unmount(); // remove component and run cleanups
```

### 1.5 Router (`router.ts`)

```typescript
// Define routes
const App = createRouter({
  "/": HomeScreen,
  "/session/:id/:phase": SessionScreen,
  "/new": NewSessionScreen,
});

// Inside components
const { navigate, back } = useRouter();
navigate("/session/abc123/prep");

const { params, path } = useRoute();
params.id; // 'abc123'
params.phase; // 'prep'

// Link component
Link({ href: "/new", class: "btn" }, "Start New Session");
```

### 1.6 Store (`store.ts`)

```typescript
// Create global store
const AppStore = createStore({
  state: {
    selectedPreset: Preset.Standard,
    sessions: [] as StoredSession[],
  },
  actions: (set, get) => ({
    selectPreset: (preset: Preset) => set({ selectedPreset: preset }),
    addSession: (session: StoredSession) =>
      set({ sessions: [...get().sessions, session] }),
  }),
});

// Use in components
function HomeScreen() {
  const { selectedPreset, sessions } = useStore(AppStore);
  const { selectPreset } = useActions(AppStore);

  return div([
    span(() => `Selected: ${selectedPreset()}`),
    Button({ onClick: () => selectPreset(Preset.Relaxed) }, "Relaxed"),
  ]);
}
```

### 1.7 Design Decisions

| Decision        | Choice                                       | Rationale                          |
| --------------- | -------------------------------------------- | ---------------------------------- |
| Signal API      | Tuple: `const [get, set] = signal(0)`        | Familiar, explicit read/write      |
| Naming          | `signal`, `derived`, `watch`                 | Clear, matches reactive literature |
| Element helpers | `div()`, `span()`, etc.                      | Less verbose than `h('div', ...)`  |
| Routing         | Hash-based (`/#/path`)                       | Works without server config        |
| Store           | Single global store with typed actions       | Simple, predictable                |
| Lifecycle       | `onMount` returns cleanup, `onCleanup` extra | Flexible cleanup patterns          |

### 1.8 Checkpoint

- Unit tests for each module
- Can mount a simple component with state
- Router navigates between test components
- Commit: `feat(web): add reactive UI framework core`

---

## Phase 2: Migrate Existing App to Framework

**Goal**: Rewrite each screen as a reactive component, delete old code as we go

### 2.1 Migration Order

1. **HomeScreen** - Simplest, good proof of concept
2. **PrepScreen** - Has form state (invariants input)
3. **CodingScreen** - Complex: timer, code editor, nudge button
4. **SummaryScreen** - Simple display
5. **ReflectionScreen** - Form with validation
6. **DoneScreen** - Simple with export action
7. **Modal system** - Proper lifecycle management
8. **Router integration** - Replace current hash routing
9. **Delete old app.ts** - Should shrink from 1007 to ~200 lines

### 2.2 Example Migration: HomeScreen

**Before (current - string templates):**

```typescript
export function render(state: AppState): string {
  return `<div class="home-screen">
    <h1>Interview Conditioning Studio</h1>
    ${PresetCard.render({ preset: Preset.Standard, selected: state.selectedPreset === Preset.Standard })}
    ${Button.render({ label: "Start", action: ACTIONS.START })}
  </div>`;
}

export function mount(container: HTMLElement, ctx: MountContext) {
  container.addEventListener("click", handleClick);
  return () => container.removeEventListener("click", handleClick);
}
```

**After (new framework - reactive components):**

```typescript
export function HomeScreen() {
  const { selectedPreset } = useStore(AppStore);
  const { selectPreset, startSession } = useActions(AppStore);

  return div({ class: "home-screen" }, [
    h1("Interview Conditioning Studio"),
    PresetCard({
      preset: Preset.Standard,
      selected: () => selectedPreset() === Preset.Standard,
      onSelect: () => selectPreset(Preset.Standard),
    }),
    Button({ label: "Start", onClick: startSession }),
  ]);
}
```

### 2.3 Checkpoint

- All existing E2E tests pass
- No string template rendering remains
- `app.ts` is ~200 lines (bootstrap + store only)
- Commit: `refactor(web): migrate all screens to reactive framework`

---

## Phase 3: Dashboard + Session Management

**Goal**: Add a dashboard as the landing page for session management

### 3.1 Route Structure

| Route                | Screen           | Description                             |
| -------------------- | ---------------- | --------------------------------------- |
| `/#/`                | Dashboard        | List sessions, stats, start new         |
| `/#/new`             | NewSessionScreen | Select preset/problem (current Home)    |
| `/#/{id}/prep`       | PrepScreen       | Prep phase                              |
| `/#/{id}/coding`     | CodingScreen     | Coding phase                            |
| `/#/{id}/silent`     | CodingScreen     | Silent phase (same screen, silent mode) |
| `/#/{id}/summary`    | SummaryScreen    | Summary phase                           |
| `/#/{id}/reflection` | ReflectionScreen | Reflection phase                        |
| `/#/{id}/done`       | DoneScreen       | Completion screen                       |

### 3.2 Dashboard Screen

**Layout**:

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

**Features**:

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

- E2E tests for dashboard (`e2e/dashboard.spec.ts`)
- Can view, resume, delete sessions
- Commit: `feat(web): add dashboard with session management`

---

## Phase 4: Pre-Session Mic Check

**Goal**: Add microphone check before starting a session

**Why deferred**: Requires proper component lifecycle management from the framework. The previous attempt failed because the modal system destroyed event handlers on re-render.

### 4.1 Mic Check Modal

**Flow**:

1. User clicks "Start Session"
2. If `audioSupported`, show MicCheckModal
3. Modal requests microphone permission
4. Shows real-time audio level visualization
5. User confirms mic works → session starts with recording
6. Or user clicks "Continue Without Recording" → session starts without audio

**Modal States**:

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
- Modal state changes don't destroy/recreate the entire DOM
- Event handlers survive re-renders
- `signal` updates audio level meter smoothly at 60fps

### 4.4 Checkpoint

- Mic check modal shows and responds to audio
- Audio saves correctly across multiple sessions without page refresh
- Commit: `feat(web): add pre-session mic check modal`

---

## Phase 5: Core Engine - Missing Metrics + Tests

**Goal**: Implement the missing behavioral signals and complete all 42 todo tests

### 5.1 New Metrics

Add to `SessionState`:

```typescript
codeChanges: number; // Total code change events
codeChangesInSilent: number; // Code changes during SILENT
codeChangedInSilent: boolean; // Whether any code changed in SILENT
nudgeTiming: NudgeTiming[]; // When each nudge was used ('early' | 'mid' | 'late')
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

- All 42 TODO tests pass
- Commit: `feat(core): add behavioral metrics (code changes, nudge timing)`

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

- Visual QA at all viewports
- E2E tests still pass
- Commit: `style(web): apply neobrutalism design language`

---

## Design Decisions

| Decision              | Choice                   | Rationale                                |
| --------------------- | ------------------------ | ---------------------------------------- |
| Framework first       | Build before mic check   | Can't fix modal lifecycle without it     |
| Soft delete expiry    | None (keep indefinitely) | Wait to see if it becomes an issue       |
| Dashboard stats       | 4 metrics                | Total, avg nudges, avg prep, this week   |
| Pagination            | 10 per page              | Reasonable default                       |
| Route for new session | `/#/new`                 | Clear separation from dashboard          |
| Theme                 | Light (default)          | Standard for neobrutalism, high contrast |
| Fonts                 | System fonts             | Zero load time, local-first philosophy   |

---

## Estimated Time

| Phase                      | Estimate   |
| -------------------------- | ---------- |
| Phase 1 (Framework)        | ~4-6 hours |
| Phase 2 (Migration)        | ~4-6 hours |
| Phase 3 (Dashboard)        | ~3-4 hours |
| Phase 4 (Mic Check)        | ~2-3 hours |
| Phase 5 (Core Engine)      | ~2-3 hours |
| Phase 6 (Neobrutalism CSS) | ~3-4 hours |

**Total: ~18-26 hours**
