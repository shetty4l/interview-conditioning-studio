# Next Steps

## Overview

Two phases of work planned:

1. **Core Engine** - Add missing behavioral metrics + complete todo tests
2. **UI Redesign** - Apply neobrutalism design language

---

## Phase 1: Core Engine - Missing Metrics + Tests

**Goal**: Implement the missing behavioral signals and complete all 42 todo tests

### 1.1 Update `core/src/types.ts`

Add to `SessionState`:

```typescript
codeChanges: number;           // Total count of code change events
codeChangesInSilent: number;   // Code changes during SILENT phase
codeChangedInSilent: boolean;  // Whether any code changed in SILENT
nudgeTiming: NudgeTiming[];    // When each nudge was used
```

Add new type:

```typescript
type NudgeTiming = 'early' | 'mid' | 'late';
```

### 1.2 Update `core/src/session.ts`

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

### 1.3 Implement the 42 Todo Tests

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

### 1.4 Checkpoint

- Run `bun run ci` - all tests pass
- Commit: `feat(core): add behavioral metrics (code changes, nudge timing)`

---

## Phase 2: Neobrutalism CSS Redesign

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

### 2.1 Update CSS Custom Properties

```css
:root {
  /* Neobrutalism core */
  --border-width: 2px;
  --border-color: #000;
  --shadow-offset: 4px;
  --shadow: 4px 4px 0px 0px var(--border-color);
  --radius: 5px;

  /* Light theme */
  --bg: #f5f0e8;            /* Warm cream background */
  --bg-secondary: #ffffff;   /* Cards/surfaces */
  --text: #000000;
  --text-muted: #444444;

  /* Phase accent colors (bold, saturated) */
  --color-prep: #a388ee;     /* Purple */
  --color-coding: #4ade80;   /* Green */
  --color-silent: #fbbf24;   /* Amber */
  --color-summary: #60a5fa;  /* Blue */
  --color-reflection: #f472b6; /* Pink */

  /* Interactive */
  --color-primary: #60a5fa;
  --color-danger: #ef4444;

  /* Typography */
  --font-weight-heading: 800;
  --font-weight-base: 500;
}
```

### 2.2 Update Component Styles

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

### 2.3 Typography

- Keep system fonts (zero load time, local-first philosophy)
- Headings: 800 weight (extra bold for brutalist punch)
- Body: 500 weight (medium)
- Monospace for code/timer: ui-monospace, "SF Mono", monospace

### 2.4 Checkpoint

- Run E2E tests at all viewports
- Visual QA
- Commit: `style(web): apply neobrutalism design language`

---

## Design Decisions Made

| Decision             | Choice                                      | Rationale                                   |
| -------------------- | ------------------------------------------- | ------------------------------------------- |
| Theme                | Light (default)                             | Standard for neobrutalism, high contrast    |
| Colors               | Keep current phase colors, adjust as needed | They're already bold and work well          |
| Fonts                | System fonts                                | Zero load time, local-first philosophy      |
| Implementation order | Core engine first, then CSS                 | Cleaner commits, test metrics independently |

---

## Files to Modify

### Phase 1 (Core Engine)

- `core/src/types.ts` - Add new state fields
- `core/src/session.ts` - Track new metrics
- `core/tests/recovery.test.ts` - Implement 9 todos
- `core/tests/phases.test.ts` - Implement 33 todos

### Phase 2 (CSS)

- `web/css/styles.css` - Complete redesign
- Potentially component `.ts` files if markup changes needed

---

## Estimated Time

- Phase 1: ~2-3 hours
- Phase 2: ~3-4 hours
