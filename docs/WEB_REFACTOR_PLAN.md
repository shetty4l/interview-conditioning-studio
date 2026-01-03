# Web UI Refactor Plan

## Overview

This document outlines the phased implementation plan for refactoring the web UI to a proper component architecture, adding hash routing, IndexedDB persistence, audio recording, and export functionality.

## Goals

1. **Component Architecture**: Screen modules with `render()`, `mount()`, `unmount()` lifecycle
2. **Hash Routing**: URL structure `/#/{sessionId}/{phase}` with automatic redirects
3. **Targeted Updates**: Timer updates without full re-render, cursor preservation in textareas
4. **Persistence**: IndexedDB storage for sessions and audio
5. **Audio Recording**: MediaRecorder with cross-browser format detection
6. **Export**: `.tar.gz` bundle using native Compression Streams API
7. **Responsive Design**: Mobile-first CSS with breakpoints at 480px, 768px, 1024px
8. **New Features**: "Submit Solution" button for early submission

## File Structure (Target)

```
web/
├── src/
│   ├── main.ts                    # Entry point, init router & storage
│   ├── app.ts                     # App controller (slim)
│   ├── router.ts                  # Hash-based router with session ID
│   ├── storage.ts                 # IndexedDB wrapper
│   ├── audio.ts                   # MediaRecorder wrapper
│   ├── tar.ts                     # TAR file writer
│   ├── export.ts                  # Export as .tar.gz
│   ├── problems.ts                # (existing) Problem definitions
│   ├── constants.ts               # Actions, components, selectors
│   ├── types.ts                   # Web-specific types
│   ├── components/
│   │   ├── index.ts               # Re-exports all components
│   │   ├── Toast.ts               # Toast notifications
│   │   ├── Timer.ts               # Timer display (targeted updates)
│   │   ├── Button.ts              # Reusable button
│   │   ├── PhaseHeader.ts         # Phase badge + timer + actions
│   │   ├── PresetCard.ts          # Preset selection card
│   │   ├── ProblemCard.ts         # Problem display (collapsible)
│   │   ├── CodeEditor.ts          # Code textarea with cursor preservation
│   │   ├── InvariantsInput.ts     # Invariants textarea
│   │   ├── InvariantsDisplay.ts   # Read-only invariants
│   │   ├── NudgeButton.ts         # Nudge button with counter
│   │   └── RecordingIndicator.ts  # Audio recording status
│   ├── screens/
│   │   ├── index.ts               # Screen registry
│   │   ├── types.ts               # Screen interface
│   │   ├── HomeScreen.ts          # Preset selection, start
│   │   ├── PrepScreen.ts          # Problem + invariants
│   │   ├── CodingScreen.ts        # Code editor + nudges + submit
│   │   ├── SilentScreen.ts        # Code editor, no nudges
│   │   ├── SummaryScreen.ts       # Session summary
│   │   ├── ReflectionScreen.ts    # 5-question form
│   │   └── DoneScreen.ts          # Completion + export
│   └── modals/
│       ├── index.ts               # Modal container management
│       ├── ConfirmModal.ts        # Generic confirm dialog
│       └── ResumeModal.ts         # Session recovery prompt
├── css/
│   └── styles.css                 # Responsive styles
└── index.html                     # Modal root container
```

## URL Routing Design

```
/#/                           → Home screen (no session)
/#/{sessionId}/prep           → PREP phase
/#/{sessionId}/coding         → CODING phase
/#/{sessionId}/silent         → SILENT phase
/#/{sessionId}/summary        → SUMMARY phase
/#/{sessionId}/reflection     → REFLECTION phase
/#/{sessionId}/done           → DONE phase
```

**Behavior:**

- URL mismatch (e.g., URL says `/coding` but session is in PREP) → Redirect to correct phase + toast
- Session not found → Redirect to home + toast "Session not found"
- URL is derived from state, not the other way around

## Component Interface

```typescript
// Screen interface
interface Screen {
  render(state: AppState): string;
  mount(ctx: ScreenContext): void;
  unmount(): void;
  update?(state: AppState): void;  // Optional targeted updates
}

interface ScreenContext {
  session: Session | null;
  navigate: (path: string) => void;
  showToast: (message: string, type?: 'info' | 'error') => void;
  showModal: (modal: Modal) => void;
}
```

## Hybrid Re-rendering Strategy

- **Full re-render**: On screen/phase transitions
- **Targeted updates**: Timer display, nudge counter
- **Cursor preservation**: CodeEditor stores and restores selection on input

---

## Phase A: Core Engine + Foundation

**Goal**: Add new event, set up constants/types that everything else depends on

| #   | Task                                                  | Files                       |
| --- | ----------------------------------------------------- | --------------------------- |
| A1  | Add `coding.solution_submitted` event type            | `core/src/types.ts`         |
| A2  | Implement transition logic (CODING → SUMMARY)         | `core/src/session.ts`       |
| A3  | Add unit tests for early submission                   | `core/tests/phases.test.ts` |
| A4  | Create constants.ts (ACTIONS, COMPONENTS, sel)        | `web/src/constants.ts`      |
| A5  | Create web types.ts (Screen interface, ScreenContext) | `web/src/types.ts`          |

**Checkpoint**: `bun run test` passes with new tests

---

## Phase B: Storage + Router + E2E

**Goal**: Persistence and URL routing infrastructure with tests

| #   | Task                                           | Files                       |
| --- | ---------------------------------------------- | --------------------------- |
| B1  | Implement IndexedDB storage wrapper            | `web/src/storage.ts`        |
| B2  | Implement hash router with session ID support  | `web/src/router.ts`         |
| B3  | Update index.html (modal-root, viewport meta)  | `web/index.html`            |
| B4  | Create minimal app.ts to wire storage + router | `web/src/app.ts` (partial)  |
| B5  | Update main.ts to init storage + router        | `web/src/main.ts` (partial) |
| B6  | E2E: Routing tests                             | `e2e/routing.spec.ts`       |
| B7  | E2E: Persistence tests                         | `e2e/persistence.spec.ts`   |

**Checkpoint**: `bun run test:e2e` passes for routing + persistence

**Note**: B4/B5 are partial implementations - just enough to test storage and router work.

---

## Phase C: Components

**Goal**: All reusable UI components with lifecycle support

| #   | Task                                       | Files                                      |
| --- | ------------------------------------------ | ------------------------------------------ |
| C1  | Toast component                            | `web/src/components/Toast.ts`              |
| C2  | Timer component (with targeted update)     | `web/src/components/Timer.ts`              |
| C3  | Button component                           | `web/src/components/Button.ts`             |
| C4  | PhaseHeader component                      | `web/src/components/PhaseHeader.ts`        |
| C5  | PresetCard component                       | `web/src/components/PresetCard.ts`         |
| C6  | ProblemCard component                      | `web/src/components/ProblemCard.ts`        |
| C7  | CodeEditor component (cursor preservation) | `web/src/components/CodeEditor.ts`         |
| C8  | InvariantsInput component                  | `web/src/components/InvariantsInput.ts`    |
| C9  | InvariantsDisplay component                | `web/src/components/InvariantsDisplay.ts`  |
| C10 | NudgeButton component                      | `web/src/components/NudgeButton.ts`        |
| C11 | RecordingIndicator component               | `web/src/components/RecordingIndicator.ts` |
| C12 | Component index (re-exports)               | `web/src/components/index.ts`              |

**Checkpoint**: Components render correctly (manual Playwright MCP verification)

---

## Phase D: Screens + E2E

**Goal**: All screen modules with tests

| #   | Task                                       | Files                                                  |
| --- | ------------------------------------------ | ------------------------------------------------------ |
| D1  | Screen types and registry                  | `web/src/screens/types.ts`, `web/src/screens/index.ts` |
| D2  | HomeScreen                                 | `web/src/screens/HomeScreen.ts`                        |
| D3  | PrepScreen                                 | `web/src/screens/PrepScreen.ts`                        |
| D4  | CodingScreen (with Submit Solution button) | `web/src/screens/CodingScreen.ts`                      |
| D5  | SilentScreen                               | `web/src/screens/SilentScreen.ts`                      |
| D6  | SummaryScreen                              | `web/src/screens/SummaryScreen.ts`                     |
| D7  | ReflectionScreen                           | `web/src/screens/ReflectionScreen.ts`                  |
| D8  | DoneScreen                                 | `web/src/screens/DoneScreen.ts`                        |
| D9  | Wire screens into app.ts                   | `web/src/app.ts` (update)                              |
| D10 | E2E: Session flow tests                    | `e2e/session-flow.spec.ts`                             |

**Checkpoint**: `bun run test:e2e` passes for full session flow

---

## Phase E: Modals + E2E

**Goal**: Modal system with tests

| #   | Task                                    | Files                            |
| --- | --------------------------------------- | -------------------------------- |
| E1  | Modal container management              | `web/src/modals/index.ts`        |
| E2  | ConfirmModal (Submit Solution, Abandon) | `web/src/modals/ConfirmModal.ts` |
| E3  | ResumeModal (session recovery)          | `web/src/modals/ResumeModal.ts`  |
| E4  | Wire modals into app.ts                 | `web/src/app.ts` (update)        |
| E5  | E2E: Modal interaction tests            | `e2e/modals.spec.ts`             |

**Checkpoint**: `bun run test:e2e` passes for modal interactions

---

## Phase F: App Integration + E2E

**Goal**: Final wiring, cleanup, comprehensive tests

| #   | Task                                      | Files                          |
| --- | ----------------------------------------- | ------------------------------ |
| F1  | Finalize app.ts (all features wired)      | `web/src/app.ts`               |
| F2  | Finalize main.ts (complete init sequence) | `web/src/main.ts`              |
| F3  | Delete old ui.ts                          | `web/src/ui.ts` (delete)       |
| F4  | E2E: Early submission flow                | `e2e/early-submission.spec.ts` |
| F5  | E2E: Abandon session flow                 | `e2e/abandon.spec.ts`          |

**Checkpoint**: `bun run test:e2e` all session flows pass

---

## Phase G: Audio + Export + E2E ✅ COMPLETE

**Goal**: Complete Phase 3 features with tests

| #   | Task                                     | Files                | Status |
| --- | ---------------------------------------- | -------------------- | ------ |
| G1  | Audio recording wrapper                  | `web/src/audio.ts`   | ✅     |
| G2  | TAR file writer                          | `web/src/tar.ts`     | ✅     |
| G3  | Export as .tar.gz                        | `web/src/export.ts`  | ✅     |
| G4  | Wire audio into screens (Coding, Silent) | Update screens       | ✅     |
| G5  | Wire export into DoneScreen              | Update DoneScreen    | ✅     |
| G6  | E2E: Audio tests                         | `e2e/audio.spec.ts`  | ✅     |
| G7  | E2E: Export tests                        | `e2e/export.spec.ts` | ✅     |

**Checkpoint**: `bun run test:e2e` passes for audio + export ✅

### Audio Format Detection

```typescript
const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'  // Chrome, Firefox
  : 'audio/mp4';               // Safari
```

### Export Format

Using native `CompressionStream('gzip')` with a minimal TAR writer (~50 lines).

Export bundle contents:

- `code.txt` - Final code
- `invariants.txt` - User's invariants
- `session.json` - Event log, metadata, reflection responses
- `audio.webm` (or `.m4a`) - Audio recording

---

## Phase H: Responsive CSS + E2E

**Goal**: Works on all screen sizes with tests

| #   | Task                                      | Files                    |
| --- | ----------------------------------------- | ------------------------ |
| H1  | Add CSS custom properties for breakpoints | `web/css/styles.css`     |
| H2  | Mobile-first base styles                  | `web/css/styles.css`     |
| H3  | Media queries for sm/md/lg breakpoints    | `web/css/styles.css`     |
| H4  | Toast and modal responsive styles         | `web/css/styles.css`     |
| H5  | E2E: Responsive tests                     | `e2e/responsive.spec.ts` |

**Checkpoint**: `bun run test:e2e` passes at all viewport sizes

### Breakpoints

```css
:root {
  --breakpoint-sm: 480px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
}
```

---

## Summary

| Phase     | Description       | New Files | Modified Files | E2E Tests |
| --------- | ----------------- | --------- | -------------- | --------- |
| **A**     | Core + Foundation | 2         | 3              | 0         |
| **B**     | Storage + Router  | 4         | 1              | 2         |
| **C**     | Components        | 12        | 0              | 0         |
| **D**     | Screens           | 9         | 1              | 1         |
| **E**     | Modals            | 3         | 1              | 1         |
| **F**     | App Integration   | 0         | 2 (+1 delete)  | 2         |
| **G**     | Audio + Export    | 3         | 2              | 2         |
| **H**     | Responsive CSS    | 0         | 1              | 1         |
| **Total** |                   | 33        | 11             | 9         |

## E2E Test Files

| Phase | Test File                  | Coverage                                                                  |
| ----- | -------------------------- | ------------------------------------------------------------------------- |
| B     | `routing.spec.ts`          | URL routing, redirects, toast on mismatch                                 |
| B     | `persistence.spec.ts`      | IndexedDB save/restore, session recovery                                  |
| D     | `session-flow.spec.ts`     | Full session: Home → Prep → Coding → Silent → Summary → Reflection → Done |
| E     | `modals.spec.ts`           | Confirm modal, Resume modal interactions                                  |
| F     | `early-submission.spec.ts` | Submit Solution skips Silent phase                                        |
| F     | `abandon.spec.ts`          | Abandon session flow                                                      |
| G     | `audio.spec.ts`            | Recording indicator, permission handling                                  |
| G     | `export.spec.ts`           | .tar.gz download, file contents                                           |
| H     | `responsive.spec.ts`       | 360px, 768px, 1200px viewport tests                                       |

## Testing Commands

```bash
bun run test        # Core unit tests
bun run test:e2e    # Playwright E2E tests
bun run test:all    # All tests
```

## Review Cadence

After each phase:

1. Show files created/modified
2. Run relevant tests
3. Playwright MCP verification if applicable
4. Wait for go-ahead before proceeding
