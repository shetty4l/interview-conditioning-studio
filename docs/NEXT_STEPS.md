# Next Steps

## Overview

Work planned in priority order:

1. **Bug Fixes** - Fix export bug and audio lifecycle
2. **Dashboard** - Session management landing page with pagination and stats
3. **Core Engine** - Add missing behavioral metrics + complete todo tests
4. **UI Redesign** - Apply neobrutalism design language

---

## Phase 0: Bug Fixes (Immediate)

### 0.1 Fix Export - Empty code.txt and invariants.txt

**Location**: `web/src/export.ts` lines 131-145

**Problem**: `extractSessionData()` looks for `event.code` and `event.invariants` instead of `event.data.code` and `event.data.invariants`

**Fix**:

```typescript
function extractSessionData(events: Event[]): { code: string; invariants: string } {
  let code = "";
  let invariants = "";

  for (const event of events) {
    if (event.type === "coding.code_changed" && event.data && "code" in event.data) {
      code = (event.data as { code: string }).code;
    }
    if (event.type === "prep.invariants_changed" && event.data && "invariants" in event.data) {
      invariants = (event.data as { invariants: string }).invariants;
    }
  }

  return { code, invariants };
}
```

### 0.2 Fix Audio - Auto-start/stop with CODING phase

**Problem**: Audio recording lifecycle is manual (user clicks record button). This is confusing and leads to empty/incomplete recordings.

**Solution**: Auto-start recording when entering CODING phase, auto-stop when exiting.

**Changes**:

1. **Remove manual record button** from CodingScreen
2. **Auto-start in `app.ts`** when `coding.started` event fires:
   - Request microphone permission
   - Start recording if granted
   - Dispatch `audio.started` event
   - Show toast on permission denial
3. **Auto-stop in `app.ts`** when exiting CODING:
   - On `coding.silent_started` (entering SILENT)
   - On `coding.solution_submitted` (early submission)
   - On `session.abandoned`
   - Dispatch `audio.stopped` event
4. **Keep RecordingIndicator** - show when recording is active
5. **Update `VALID_TRANSITIONS`** in core if needed

**Files to modify**:

- `web/src/app.ts` - Add auto-start/stop logic
- `web/src/screens/CodingScreen.ts` - Remove record button, keep indicator
- `core/src/session.ts` - Update valid transitions if needed

### 0.3 Checkpoint

- Run `bun run ci` - all tests pass
- Manual test: complete a session, verify export has code/invariants/audio
- Commit: `fix(web): fix export data extraction and auto-manage audio recording`

---

## Phase 1: Dashboard + Session Management

**Goal**: Add a dashboard as the landing page for session management

### 1.1 Route Structure

| Route              | Screen           | Description                              |
| ------------------ | ---------------- | ---------------------------------------- |
| `/#/`              | Dashboard        | List sessions, stats, start new          |
| `/#/new`           | NewSessionScreen | Select preset/problem (current Home)     |
| `/#/{id}/prep`     | PrepScreen       | Prep phase                               |
| `/#/{id}/coding`   | CodingScreen     | Coding phase                             |
| `/#/{id}/silent`   | CodingScreen     | Silent phase (same screen, silent mode)  |
| `/#/{id}/summary`  | SummaryScreen    | Summary phase                            |
| `/#/{id}/reflection` | ReflectionScreen | Reflection phase                       |
| `/#/{id}/done`     | DoneScreen       | Completion screen                        |

### 1.2 Dashboard Screen (`web/src/screens/DashboardScreen.ts`)

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
│  │ Two Sum        │ ✓ Completed │ Jan 3  │ [📤] [🗑️] │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Merge Lists    │ ⏳ In Progress │ Jan 3 │ [▶️] [🗑️] │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Valid Parens   │ ✗ Abandoned │ Jan 2  │ [📤] [🗑️] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← Prev]  Page 1 of 3  [Next →]                           │
└─────────────────────────────────────────────────────────────┘
```

**Features**:

- Aggregate stats at top (total sessions, avg nudges, avg prep time, this week count)
- "Start New Session" button → navigates to `/#/new`
- Session list with pagination (10 per page)
- Per-session actions:
  - **Resume** (if in-progress) → navigate to current phase
  - **Export** (if completed/abandoned) → download .tar.gz
  - **Delete** → soft delete with confirmation modal

### 1.3 Soft Delete Implementation

**Add to `StoredSession` type**:

```typescript
deletedAt?: number | null; // Timestamp when soft-deleted, null if active
```

**Storage changes** (`web/src/storage.ts`):

- `softDeleteSession(id)` - Sets `deletedAt` to current timestamp
- `restoreSession(id)` - Sets `deletedAt` to null
- `getAllSessions()` - Filter out sessions where `deletedAt` is set
- `getDeletedSessions()` - Return only soft-deleted sessions
- `permanentlyDeleteSession(id)` - Actually remove from IndexedDB

**No automatic expiry** - Keep soft-deleted sessions indefinitely for now.

### 1.4 Stats Calculation

Add `getSessionStats()` to storage.ts:

```typescript
interface SessionStats {
  totalCompleted: number;
  totalAbandoned: number;
  avgNudgesUsed: number;
  avgPrepTime: number; // in ms
  sessionsThisWeek: number;
}
```

Calculate from completed sessions by iterating events.

### 1.5 Rename HomeScreen → NewSessionScreen

- Rename file: `HomeScreen.ts` → `NewSessionScreen.ts`
- Update exports in `screens/index.ts`
- Update router to use new name
- Route: `/#/new`

### 1.6 Update Router

**Changes to `web/src/router.ts`**:

- Add `dashboard` route for `/#/`
- Add `new` route for `/#/new`
- Update `getRouteForPhase()` to handle new structure
- Default route (`/#/`) now goes to Dashboard, not NewSession

### 1.7 Files to Create/Modify

**Create**:

- `web/src/screens/DashboardScreen.ts`
- `web/src/components/SessionCard.ts` (for session list items)
- `web/src/components/Pagination.ts`
- `web/src/components/StatsBar.ts`

**Modify**:

- `web/src/screens/HomeScreen.ts` → rename to `NewSessionScreen.ts`
- `web/src/screens/index.ts` - Update exports
- `web/src/router.ts` - Add new routes
- `web/src/storage.ts` - Add soft delete, stats
- `web/src/types.ts` - Add `deletedAt` to StoredSession
- `web/src/app.ts` - Handle new routes
- `web/css/styles.css` - Dashboard styles

### 1.8 Checkpoint

- Run `bun run ci` - all tests pass
- Add E2E tests for dashboard (`e2e/dashboard.spec.ts`)
- Commit: `feat(web): add dashboard with session management and stats`

---

## Phase 2: Core Engine - Missing Metrics + Tests

**Goal**: Implement the missing behavioral signals and complete all 42 todo tests

### 2.1 Update `core/src/types.ts`

Add to `SessionState`:

```typescript
codeChanges: number; // Total count of code change events
codeChangesInSilent: number; // Code changes during SILENT phase
codeChangedInSilent: boolean; // Whether any code changed in SILENT
nudgeTiming: NudgeTiming[]; // When each nudge was used
```

Add new type:

```typescript
type NudgeTiming = "early" | "mid" | "late";
```

### 2.2 Update `core/src/session.ts`

**Initialize new fields in `deriveState()`:**

- `codeChanges: 0`
- `codeChangesInSilent: 0`
- `codeChangedInSilent: false`
- `nudgeTiming: []`

**Track metrics in `applyEvent()`:**

For `coding.code_changed`:

- Increment `codeChanges`
- If phase is SILENT, also increment `codeChangesInSilent`

For `nudge.requested`:

- Calculate timing classification based on elapsed coding time:
  - `(nudgeTimestamp - codingStartedAt) / codingDuration`
  - 0-33%: `'early'`
  - 34-66%: `'mid'`
  - 67-100%: `'late'`
- Append to `nudgeTiming` array

**Derive `codeChangedInSilent`:**

- Set to `codeChangesInSilent > 0` at end of state derivation

### 2.3 Implement the 42 Todo Tests

**`core/tests/recovery.test.ts`** (~9 todos):

- Restore from events: restore session state, derive same state, preserve timestamps
- Explicit abandonment: set status, reject events after, allow from any phase
- State after recovery: restore phase, code/invariants, nudge count

**`core/tests/phases.test.ts`** (~33 todos):

PREP phase:

- Invariants handling: persist across changes, use last value, allow empty/whitespace
- Nudges in PREP: not allowed, nudgesAllowed=false

CODING phase:

- Code changes: track changes, count total, preserve latest snapshot
- Nudge mechanics: classify early/mid/late timing
- Timer behavior: track coding time, transition to SILENT

SILENT phase:

- Code changes: allow changes, track codeChangesInSilent, set codeChangedInSilent flag
- Nudges disabled: reject nudge requests
- Timer behavior: track silent time, transition to SUMMARY

REFLECTION phase:

- Response capture: capture in state, transition to DONE, auto-emit session.completed
- Mandatory completion: require reflection, no skipping
- Response validation: accept valid values, reject invalid, enforce n/a constraint

### 2.4 Checkpoint

- Run `bun run ci` - all tests pass
- Commit: `feat(core): add behavioral metrics (code changes, nudge timing)`

---

## Phase 3: Neobrutalism CSS Redesign

**Goal**: Apply neobrutalism aesthetics while maintaining responsive design

**Reference**: https://www.neobrutalism.dev/

### Neobrutalism Key Characteristics

1. **Hard black borders** (2px solid black)
2. **Offset box shadows** (4px 4px 0px 0px black - no blur)
3. **Bright/bold colors** with high contrast
4. **Small rounded corners** (~5px border-radius)
5. **Hover translate effect** - element moves, shadow disappears
6. **Bold typography** - 800 headings, 500 body
7. **No gradients, no blur** - flat and stark
8. **Light background** with dark accents

### Why It Fits ICS

- "Uncomfortable" aesthetic aligns with product principle: _"If users feel slightly uncomfortable, slightly exposed, and more confident afterward, the product is working"_
- High contrast aids focus during timed sessions
- Bold, stark design creates sense of seriousness/intensity
- Distinctive look - won't be confused with "friendly" learning apps

### 3.1 Update CSS Custom Properties

```css
:root {
  /* Neobrutalism core */
  --border-width: 2px;
  --border-color: #000;
  --shadow-offset: 4px;
  --shadow: 4px 4px 0px 0px var(--border-color);
  --radius: 5px;

  /* Light theme */
  --bg: #f5f0e8; /* Warm cream background */
  --bg-secondary: #ffffff; /* Cards/surfaces */
  --text: #000000;
  --text-muted: #444444;

  /* Phase accent colors (bold, saturated) */
  --color-prep: #a388ee; /* Purple */
  --color-coding: #4ade80; /* Green */
  --color-silent: #fbbf24; /* Amber */
  --color-summary: #60a5fa; /* Blue */
  --color-reflection: #f472b6; /* Pink */

  /* Interactive */
  --color-primary: #60a5fa;
  --color-danger: #ef4444;

  /* Typography */
  --font-weight-heading: 800;
  --font-weight-base: 500;
}
```

### 3.2 Update Component Styles

**Buttons:**

```css
.btn {
  border: 2px solid var(--border-color);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  font-weight: var(--font-weight-base);
  transition: transform 0.1s, box-shadow 0.1s;
}

.btn:hover {
  transform: translate(4px, 4px);
  box-shadow: none;
}
```

**Cards/Surfaces:**

- Black 2px borders
- Offset shadow
- White or cream background

**Inputs/Textareas:**

- Heavy 2px black borders
- No focus ring, just border color change on focus
- White background

**Phase Badges:**

- Bold background colors
- Black borders
- White or black text depending on contrast

**Timer:**

- Large monospace font
- High contrast (black on white or inverse)

**Modals:**

- Black borders
- Offset shadow
- No backdrop blur (solid dark overlay instead)

**Toasts:**

- Black borders
- Small offset shadow
- Bold background colors for different types

### 3.3 Typography

- Keep system fonts (zero load time, local-first philosophy)
- Headings: 800 weight (extra bold for brutalist punch)
- Body: 500 weight (medium)
- Monospace for code/timer: ui-monospace, "SF Mono", monospace

### 3.4 Checkpoint

- Run E2E tests at all viewports
- Visual QA
- Commit: `style(web): apply neobrutalism design language`

---

## Design Decisions

| Decision             | Choice                       | Rationale                                    |
| -------------------- | ---------------------------- | -------------------------------------------- |
| Audio lifecycle      | Auto-start/stop with CODING  | More deterministic, less user confusion      |
| Soft delete expiry   | None (keep indefinitely)     | Wait to see if it becomes an issue           |
| Dashboard stats      | 4 metrics                    | Total, avg nudges, avg prep, this week       |
| Pagination           | 10 per page                  | Reasonable default                           |
| Route for new session| `/#/new`                     | Clear separation from dashboard              |
| Theme                | Light (default)              | Standard for neobrutalism, high contrast     |
| Colors               | Keep current, adjust as needed | Already bold and work well                 |
| Fonts                | System fonts                 | Zero load time, local-first philosophy       |

---

## Files Summary

### Phase 0 (Bug Fixes)

- `web/src/export.ts` - Fix data extraction
- `web/src/app.ts` - Auto-start/stop audio
- `web/src/screens/CodingScreen.ts` - Remove record button

### Phase 1 (Dashboard)

**Create**:

- `web/src/screens/DashboardScreen.ts`
- `web/src/components/SessionCard.ts`
- `web/src/components/Pagination.ts`
- `web/src/components/StatsBar.ts`
- `e2e/dashboard.spec.ts`

**Modify**:

- `web/src/screens/HomeScreen.ts` → `NewSessionScreen.ts`
- `web/src/screens/index.ts`
- `web/src/router.ts`
- `web/src/storage.ts`
- `web/src/types.ts`
- `web/src/app.ts`
- `web/css/styles.css`

### Phase 2 (Core Engine)

- `core/src/types.ts`
- `core/src/session.ts`
- `core/tests/recovery.test.ts`
- `core/tests/phases.test.ts`

### Phase 3 (CSS)

- `web/css/styles.css`
- Potentially component `.ts` files if markup changes needed

---

## Estimated Time

- Phase 0 (Bug Fixes): ~1-2 hours
- Phase 1 (Dashboard): ~3-4 hours
- Phase 2 (Core Engine): ~2-3 hours
- Phase 3 (Neobrutalism): ~3-4 hours

**Total: ~10-13 hours**
