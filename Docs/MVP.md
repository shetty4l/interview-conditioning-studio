# Interview Conditioning Studio — MVP Plan

## Summary

A local-first, browser-based interview conditioning tool with:
- TypeScript core engine (compiled to JS)
- Pure JS/CSS web app
- Minimal dependencies (just for build tooling)

---

## Session Timing

| Phase | Duration | Nudges | Audio |
|-------|----------|--------|-------|
| PREP | 5 min | No | No |
| CODING | 35 min | Yes (3 max) | Yes |
| SILENT | 5 min | No | Yes |
| SUMMARY | — | — | No |

**Total: 45 minutes**

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         WEB APP (Pure JS/CSS)                         │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │   app.js    │  │   ui.js     │  │  audio.js   │  │  export.js  │  │  │
│  │  │ Controller  │  │ DOM/Render  │  │ MediaRec.   │  │ JSZip       │  │  │
│  │  └──────┬──────┘  └──────▲──────┘  └──────┬──────┘  └──────┬──────┘  │  │
│  │         │                │                │                │         │  │
│  │         │    renders     │                │                │         │  │
│  │         ├────────────────┘                │                │         │  │
│  │         │                                 │                │         │  │
│  │         │  ┌──────────────────────────────┼────────────────┤         │  │
│  │         │  │                              │                │         │  │
│  │         ▼  ▼                              ▼                ▼         │  │
│  │  ┌─────────────┐                   ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ storage.js  │                   │ Audio Blob  │  │  .zip file  │  │  │
│  │  │ IndexedDB   │                   │   (webm)    │  │  (bundle)   │  │  │
│  │  └─────────────┘                   └─────────────┘  └─────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐                                                     │  │
│  │  │ problems.js │  Hardcoded problem set                              │  │
│  │  └─────────────┘                                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                            │                                                │
│                            │ imports                                        │
│                            ▼                                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      CORE ENGINE (TypeScript → JS)                    │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                        index.ts (Public API)                    │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │         │              │              │              │                │  │
│  │         ▼              ▼              ▼              ▼                │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │  │
│  │  │session.ts │  │ events.ts │  │  nudge.ts │  │ summary.ts│          │  │
│  │  │           │  │           │  │           │  │           │          │  │
│  │  │ State     │  │ Append-   │  │ Budget:3  │  │ Derive    │          │  │
│  │  │ Machine   │  │ only Log  │  │ Phase-    │  │ metrics   │          │  │
│  │  │           │  │           │  │ gated     │  │ from log  │          │  │
│  │  └─────┬─────┘  └─────┬─────┘  └───────────┘  └───────────┘          │  │
│  │        │              │                                               │  │
│  │        │              │        ┌───────────┐  ┌───────────┐          │  │
│  │        └──────────────┼───────►│ timer.ts  │  │ types.ts  │          │  │
│  │                       │        │           │  │           │          │  │
│  │                       │        │ Phase     │  │ Shared    │          │  │
│  │                       │        │ timing    │  │ types     │          │  │
│  │                       │        └───────────┘  └───────────┘          │  │
│  │                       │                                               │  │
│  │                       ▼                                               │  │
│  │              ┌─────────────────┐                                      │  │
│  │              │   Event Log     │                                      │  │
│  │              │   (in memory)   │                                      │  │
│  │              │                 │                                      │  │
│  │              │ • session.*     │                                      │  │
│  │              │ • prep.*        │                                      │  │
│  │              │ • coding.*      │                                      │  │
│  │              │ • nudge.*       │                                      │  │
│  │              │ • audio.*       │                                      │  │
│  │              └─────────────────┘                                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## State Machine

```
                    ┌──────────────────────────────────────────┐
                    │                                          │
                    ▼                                          │
              ┌──────────┐                                     │
              │  START   │                                     │
              └────┬─────┘                                     │
                   │ user clicks "Start Session"               │
                   │ problem auto-selected                     │
                   ▼                                           │
              ┌──────────┐                                     │
              │   PREP   │  5 min, SILENT                      │
              │          │  • Read problem                     │
              │          │  • Write invariants                 │
              │          │  • No nudges                        │
              └────┬─────┘                                     │
                   │                                           │
                   │ invariants submitted                      │
                   │ OR timer expires (warning → force)        │
                   ▼                                           │
              ┌──────────┐                                     │
              │  CODING  │  35 min, ACTIVE                     │
              │          │  • Write code                       │
              │          │  • Audio recording                  │
              │          │  • Nudges allowed (3 max)           │
              └────┬─────┘                                     │
                   │                                           │
                   │ 35 min elapsed                            │
                   ▼                                           │
              ┌──────────┐                                     │
              │  SILENT  │  5 min, SILENT                      │
              │          │  • Continue coding                  │
              │          │  • No nudges                        │
              │          │  • Audio continues                  │
              └────┬─────┘                                     │
                   │                                           │
                   │ timer expires                             │
                   ▼                                           │
              ┌──────────┐                                     │
              │ SUMMARY  │                                     │
              │          │  • View stats                       │
              │          │  • Download bundle                  │
              └────┬─────┘                                     │
                   │                                           │
                   │ user clicks "New Session"                 │
                   │                                           │
                   └───────────────────────────────────────────┘
```

---

## File Structure

```
InterviewDeck/
├── Docs/
│   ├── Architecture.md
│   ├── PRD.md
│   └── MVP.md
├── core/                     
│   ├── src/
│   │   ├── index.ts          
│   │   ├── session.ts        
│   │   ├── events.ts         
│   │   ├── nudge.ts          
│   │   ├── timer.ts          
│   │   ├── summary.ts        
│   │   └── types.ts          
│   ├── package.json
│   └── tsconfig.json
├── web/                      
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js            
│   │   ├── router.js
│   │   ├── audio.js          
│   │   ├── storage.js        
│   │   ├── export.js
│   │   ├── lib/
│   │   │   └── core.js       # Copied from core/dist/
│   │   ├── vendor/
│   │   │   └── jszip.min.js  # Local copy for offline use
│   │   ├── problems/
│   │   │   └── problems.js
│   │   └── ui/
│   │       ├── index.js          # Shared utilities
│   │       ├── constants.js      # ACTIONS, COMPONENTS, selectors
│   │       ├── components/
│   │       │   ├── Timer.js
│   │       │   ├── Header.js
│   │       │   ├── ProblemCard.js
│   │       │   ├── CodeEditor.js
│   │       │   ├── InvariantsInput.js
│   │       │   ├── InvariantsDisplay.js
│   │       │   ├── NudgeButton.js
│   │       │   ├── RecordingIndicator.js
│   │       │   └── Button.js
│   │       ├── screens/
│   │       │   ├── StartScreen.js
│   │       │   ├── PrepScreen.js
│   │       │   ├── CodingScreen.js
│   │       │   ├── SilentScreen.js
│   │       │   └── SummaryScreen.js
│   │       └── modals/
│   │           ├── ResumeModal.js
│   │           └── PrepWarningModal.js
├── package.json              
└── README.md
```

---

## Core Engine Modules

| Module | Responsibility |
|--------|----------------|
| `types.ts` | Type definitions (Phase, Event, Session, Problem, Config, Summary) |
| `events.ts` | Append-only event log, timestamping, filtering |
| `session.ts` | State machine, phase transitions, validation |
| `timer.ts` | Phase timing, remaining time calculation, expiry detection |
| `nudge.ts` | Budget tracking (3 max), phase-gating rules |
| `summary.ts` | Derive summary metrics from event log |
| `index.ts` | Public API exports |

---

## Web App Modules

| Module | Responsibility |
|--------|----------------|
| `app.js` | Main controller, wires core engine to UI |
| `router.js` | Hash-based client-side routing |
| `audio.js` | MediaRecorder wrapper, start/stop/export |
| `storage.js` | IndexedDB wrapper for sessions and audio |
| `export.js` | Zip bundle creation using JSZip |
| `problems.js` | Hardcoded problem set (3-5 problems) |

---

## UI Architecture

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Vanilla JS | Smaller bundle (~100KB vs ~255KB), no build complexity, aligns with local-first philosophy |
| UI organization | Screen Modules + Reusable Components | Reusability without framework overhead |
| Screen lifecycle | `render(state)`, `mount(session)`, `unmount()` | Clear lifecycle, similar to React patterns |
| ID/class management | Constants + Data Attributes | Prevents typos, separates JS hooks from CSS |
| Modals | Separate modules with `show(callbacks)` / `hide()` | Reusable, layered rendering |

### Screen Module Pattern

Each screen exports three functions:

```javascript
// ui/screens/StartScreen.js
import { ACTIONS, sel } from '../constants.js';

export function render(state) {
  return `
    <div class="screen start-screen">
      <button data-action="${ACTIONS.START_SESSION}" class="primary-btn">
        Start Session
      </button>
    </div>
  `;
}

export function mount(session) {
  document.querySelector(sel.action(ACTIONS.START_SESSION))
    .addEventListener('click', () => {
      session.dispatch('session.started', { problem });
    });
}

export function unmount() {
  // Cleanup if needed
}
```

### Reusable Components

Components are functions that return HTML strings:

```javascript
// ui/components/Timer.js
export function Timer(remainingTime, phase) {
  const minutes = Math.floor(remainingTime / 60000);
  const seconds = Math.floor((remainingTime % 60000) / 1000);
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return `
    <div class="timer" data-component="timer" data-phase="${phase}">
      <span class="timer-display">${display}</span>
    </div>
  `;
}
```

Screens compose components:

```javascript
// ui/screens/CodingScreen.js
import { Timer } from '../components/Timer.js';
import { ProblemCard } from '../components/ProblemCard.js';
import { CodeEditor } from '../components/CodeEditor.js';

export function render(state) {
  return `
    <div class="screen coding-screen">
      ${Timer(state.remainingTime, 'coding')}
      ${ProblemCard(state.problem, true)}
      ${CodeEditor(state.code)}
    </div>
  `;
}
```

### Constants & Selectors

Centralized constants prevent string typos:

```javascript
// ui/constants.js
export const ACTIONS = {
  START_SESSION: 'start-session',
  START_CODING: 'start-coding',
  REQUEST_NUDGE: 'request-nudge',
  DOWNLOAD_BUNDLE: 'download-bundle',
  NEW_SESSION: 'new-session',
  RESUME: 'resume',
  ABANDON: 'abandon',
};

export const COMPONENTS = {
  TIMER: 'timer',
  CODE_EDITOR: 'code-editor',
  INVARIANTS_INPUT: 'invariants-input',
  PROBLEM_CARD: 'problem-card',
};

export const sel = {
  action: (name) => `[data-action="${name}"]`,
  component: (name) => `[data-component="${name}"]`,
};
```

### Modal Pattern

Modals render to a dedicated container:

```javascript
// ui/modals/ResumeModal.js
import { ACTIONS, sel } from '../constants.js';

export function show(onResume, onAbandon) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay">
      <div class="modal">
        <h2>Session in progress</h2>
        <button data-action="${ACTIONS.RESUME}">Resume</button>
        <button data-action="${ACTIONS.ABANDON}">Abandon</button>
      </div>
    </div>
  `;
  root.classList.remove('hidden');
  
  document.querySelector(sel.action(ACTIONS.RESUME))
    .addEventListener('click', () => { hide(); onResume(); });
  document.querySelector(sel.action(ACTIONS.ABANDON))
    .addEventListener('click', () => { hide(); onAbandon(); });
}

export function hide() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
  root.classList.add('hidden');
}
```

### Reusable Components List

| Component | Used In | Props |
|-----------|---------|-------|
| `Timer` | Prep, Coding, Silent | `remainingTime`, `phase` |
| `Header` | All screens | `title`, `rightContent` |
| `ProblemCard` | Prep, Coding, Silent | `problem`, `collapsible` |
| `CodeEditor` | Coding, Silent, Summary | `code`, `readonly` |
| `InvariantsInput` | Prep | `value` |
| `InvariantsDisplay` | Coding, Silent, Summary | `invariants` |
| `NudgeButton` | Coding, Silent | `remaining`, `disabled` |
| `RecordingIndicator` | Coding, Silent | `active` |
| `Button` | All screens | `text`, `action`, `variant` |

---

## UX Wireframes

### Screen 1: Start

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                                                             │
│                                                             │
│                    INTERVIEW CONDITIONING                   │
│                          STUDIO                             │
│                                                             │
│                                                             │
│                  ┌─────────────────────┐                    │
│                  │   Start Session     │                    │
│                  └─────────────────────┘                    │
│                                                             │
│                                                             │
│              45 min • No tests • No hints                   │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Screen 2: Prep Phase

```
┌─────────────────────────────────────────────────────────────┐
│  PREP                                            ⏱ 4:32     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ TWO SUM                                             │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │                                                     │    │
│  │ Given an array of integers nums and an integer      │    │
│  │ target, return indices of the two numbers such      │    │
│  │ that they add up to target.                         │    │
│  │                                                     │    │
│  │ You may assume that each input would have exactly   │    │
│  │ one solution, and you may not use the same element  │    │
│  │ twice.                                              │    │
│  │                                                     │    │
│  │ You can return the answer in any order.             │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  INVARIANTS                                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ # Assumptions:                                      │    │
│  │ # - Array has at least 2 elements                   │    │
│  │ # - Exactly one valid solution exists               │    │
│  │ # - Cannot use same index twice                     │    │
│  │ #                                                   │    │
│  │ # Approach:                                         │    │
│  │ # - Use hashmap to store complement                 │    │
│  │ │                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                  ┌─────────────────────┐                    │
│                  │   Start Coding  →   │                    │
│                  └─────────────────────┘                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Screen 2b: Prep Timer Warning (Modal)

```
┌─────────────────────────────────────────────────────────────┐
│  PREP                                            ⏱ 0:00     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│      ┌───────────────────────────────────────────┐          │
│      │                                           │          │
│      │   ⚠  PREP TIME EXPIRED                    │          │
│      │                                           │          │
│      │   Moving to coding phase in 5 seconds...  │          │
│      │                                           │          │
│      │        ┌──────────────────────┐           │          │
│      │        │  Start Coding Now    │           │          │
│      │        └──────────────────────┘           │          │
│      │                                           │          │
│      └───────────────────────────────────────────┘          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Screen 3: Coding Phase

```
┌─────────────────────────────────────────────────────────────┐
│  CODING                                         ⏱ 28:14     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Problem ──────────────────────────────────────────[−]┐  │
│  │ TWO SUM                                               │  │
│  │ Given an array of integers nums and an integer...     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Invariants ───────────────────────────────────────────┐ │
│  │ # Assumptions: Array has at least 2 elements...        │ │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Code ─────────────────────────────────────────────────┐ │
│  │ def two_sum(nums, target):                             │ │
│  │     seen = {}                                          │ │
│  │     for i, num in enumerate(nums):                     │ │
│  │         complement = target - num                      │ │
│  │         if complement in seen:                         │ │
│  │             return [seen[complement], i]               │ │
│  │         seen[num] = i                                  │ │
│  │     return []│                                         │ │
│  │                                                        │ │
│  │                                                        │ │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────┐                                      │
│  │  Request Nudge    │  2 remaining                         │
│  └───────────────────┘                                      │
│                                                      🔴 REC │
└─────────────────────────────────────────────────────────────┘
```

### Screen 4: Silent Phase

```
┌─────────────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░ SILENT PHASE ░░░░░░░░░░░░░░░░  ⏱ 3:42     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Problem ──────────────────────────────────────────[−]┐  │
│  │ TWO SUM                                               │  │
│  │ Given an array of integers nums and an integer...     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Invariants ───────────────────────────────────────────┐ │
│  │ # Assumptions: Array has at least 2 elements...        │ │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Code ─────────────────────────────────────────────────┐ │
│  │ def two_sum(nums, target):                             │ │
│  │     seen = {}                                          │ │
│  │     for i, num in enumerate(nums):                     │ │
│  │         complement = target - num                      │ │
│  │         if complement in seen:                         │ │
│  │             return [seen[complement], i]               │ │
│  │         seen[num] = i                                  │ │
│  │     return []                                          │ │
│  │                                                        │ │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────┐                                      │
│  │  ░░ No Nudges ░░  │  SILENT                              │
│  └───────────────────┘                                      │
│                                                      🔴 REC │
└─────────────────────────────────────────────────────────────┘
```

### Screen 5: Summary

```
┌─────────────────────────────────────────────────────────────┐
│  SESSION COMPLETE                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Statistics ───────────────────────────────────────────┐ │
│  │                                                        │ │
│  │  Problem:        Two Sum                               │ │
│  │  Total Time:     45:00                                 │ │
│  │                                                        │ │
│  │  Prep:           4:28                                  │ │
│  │  Coding:         35:00                                 │ │
│  │  Silent:         5:00                                  │ │
│  │                                                        │ │
│  │  Nudges Used:    1 / 3                                 │ │
│  │  Code Changes:   47                                    │ │
│  │                                                        │ │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Invariants ───────────────────────────────────────────┐ │
│  │ # Assumptions: Array has at least 2 elements           │ │
│  │ # Exactly one valid solution exists...                 │ │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Final Code ───────────────────────────────────────────┐ │
│  │ def two_sum(nums, target):                             │ │
│  │     seen = {}                                          │ │
│  │     ...                                                │ │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐         │
│  │  Download Bundle    │    │   New Session       │         │
│  └─────────────────────┘    └─────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Export Bundle Structure

```
session-abc123.zip
│
├── session.json      # Structured data for LLM analysis
├── problem.md        # Problem statement
├── invariants.txt    # User's invariants
├── code.py           # Final code snapshot
├── audio.webm        # Voice recording
├── summary.md        # Human-readable summary with timeline
└── prompt.md         # LLM analysis guidance
```

### session.json

Structured data optimized for LLM analysis:

```json
{
  "id": "k5x2m9",
  "version": "1.0",
  "problem": {
    "id": "two-sum",
    "title": "Two Sum",
    "description": "Given an array of integers..."
  },
  "timing": {
    "totalDuration": 2700000,
    "prepDuration": 268000,
    "codingDuration": 2100000,
    "silentDuration": 300000
  },
  "metrics": {
    "nudgesUsed": 1,
    "nudgesAvailable": 3,
    "codeChanges": 47,
    "codeChangesInSilent": 12
  },
  "flags": {
    "invariantsEmpty": false,
    "prepTimeExpired": false,
    "allNudgesUsed": false,
    "codeChangedInSilent": true
  },
  "content": {
    "invariants": "# Assumptions:\n# - Array has at least 2 elements...",
    "finalCode": "def two_sum(nums, target):..."
  },
  "events": [
    { "type": "session.started", "timestamp": 1234567890, "data": {} }
  ]
}
```

### summary.md

Human-readable summary with timeline and observations:

```markdown
# Session Summary

## Problem
**Title:** Two Sum
**Description:**
Given an array of integers nums and an integer target...

## Session Timeline
- 00:00 — Session started
- 04:28 — Coding started (prep time used: 4:28 / 5:00)
- 12:15 — Nudge requested (1/3)
- 39:28 — Silent phase entered
- 44:28 — Session ended

## Statistics
| Metric | Value |
|--------|-------|
| Total Duration | 45:00 |
| Prep Time Used | 4:28 / 5:00 |
| Coding Time | 35:00 |
| Silent Time | 5:00 |
| Nudges Used | 1 / 3 |
| Code Changes | 47 |

## Invariants
\```
# Assumptions:
# - Array has at least 2 elements
# - Exactly one valid solution exists
\```

## Final Code
\```python
def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []
\```

## Observations
- Invariants were provided before coding
- Transitioned to coding before prep timer expired
- Used 1 of 3 available nudges at 27:15 remaining
- Code was modified 12 times during silent phase
```

### prompt.md

Guidance for LLM analysis of the session:

```markdown
# Analysis Request

Please analyze this coding interview practice session and provide feedback on:

1. **Problem Understanding**: Did the invariants capture key constraints and edge cases?
2. **Approach**: Was the solution strategy sound? Was it articulated before coding?
3. **Execution**: How was progress managed under time pressure?
4. **Code Quality**: Is the final code correct? Are edge cases handled?
5. **Recovery**: If stuck, how did the candidate respond? Were nudges used effectively?
6. **Recommendations**: What should the candidate focus on improving?

## Files Included
- `problem.md` — The problem statement
- `invariants.txt` — Candidate's pre-coding notes
- `code.py` — Final solution
- `session.json` — Full session data, timeline, and metrics
- `summary.md` — Human-readable session summary
- `audio.webm` — Verbal reasoning (if supported by your model)

## Context
This is an interview conditioning tool. The goal is not to judge correctness, but to
help the candidate improve their interview-relevant behaviors: problem framing,
time management, articulating reasoning, and recovering from stuck points.
```

---

## Key Behaviors

- **Audio permission**: Requested on app load; if denied, continue without audio and show indicator
- **Nudge button**: Logs `nudge.requested` event, decrements counter, shows nothing to user (they talk through it)
- **Prep expiry**: Warning modal, then auto-transition to CODING after 5 seconds
- **Empty invariants**: Allowed; flagged in session.json and noted in summary observations
- **SILENT phase**: Visual indicator (e.g., banner, color shift), nudge button disabled
- **Audio recording**: Starts at CODING phase, stops at SUMMARY
- **Persistence**: Session saved to IndexedDB on every state change, restored on page load
- **Session completion**: phase='DONE' after summary; skip resume modal on reload, show summary directly
- **Problem selection**: Random from hardcoded set; repeats allowed
- **Export**: Downloads `session-{id}.zip` containing session.json, code.py, invariants.txt, audio.webm, summary.md, problem.md, prompt.md

---

## Client-Side Routing

Hash-based routing for simplicity (no server configuration required).

### Routes

| Hash | Screen |
|------|--------|
| `#/` | Start screen |
| `#/prep` | Prep phase |
| `#/coding` | Coding phase |
| `#/silent` | Silent phase |
| `#/summary` | Summary screen |

### Implementation

```javascript
// router.js
const routes = {
  '/': renderStartScreen,
  '/prep': renderPrepScreen,
  '/coding': renderCodingScreen,
  '/silent': renderSilentScreen,
  '/summary': renderSummaryScreen,
};

function router() {
  const path = window.location.hash.slice(1) || '/';
  const render = routes[path] || routes['/'];
  render();
}

function navigate(path) {
  window.location.hash = path;
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
```

---

## State Management (Event-Sourced)

The system uses event sourcing for safe state mutation and querying.

### Pattern

```
┌─────────────────┐      ┌─────────────────────────────┐
│   Event Log     │ ───► │   Derived State (computed)   │
│   (append-only) │      │                              │
│                 │      │   • currentPhase             │
│   • event 1     │      │   • remainingTime            │
│   • event 2     │      │   • nudgesRemaining          │
│   • event 3     │      │   • code (latest snapshot)   │
│   • ...         │      │   • invariants               │
└─────────────────┘      └─────────────────────────────┘

Single source of truth    Recomputed from events
```

### Key Principles

1. **State is never mutated directly** — only events are appended
2. **Mutation via `dispatch(eventType, data)`** — appends event, invalidates cache
3. **Query via `getState()`** — derives current state from event log (with caching)
4. **Deterministic** — same events always produce same state
5. **Recoverable** — replay events from storage to restore session

### Implementation

```javascript
class Session {
  constructor() {
    this.events = [];        // Append-only log
    this.listeners = [];     // Subscribed callbacks
    this._state = null;      // Cached derived state
    this._stateVersion = -1; // Cache invalidation
  }

  dispatch(eventType, data = {}) {
    const event = {
      type: eventType,
      timestamp: Date.now(),
      data
    };
    this.events.push(event);
    this._stateVersion = -1; // Invalidate cache
    this._notifyListeners(event);
    return event;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  _notifyListeners(event) {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(event, state);
    }
  }

  getState() {
    if (this._stateVersion === this.events.length) {
      return this._state;
    }
    this._state = this._deriveState();
    this._stateVersion = this.events.length;
    return this._state;
  }

  _deriveState() {
    // Replay events to compute current state
    // ...
  }
}
```

---

## Event Flow

Components communicate through the session's event system:

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Event Dispatch                              │
│                                                                     │
│   UI Action (click, input)                                          │
│         │                                                           │
│         ▼                                                           │
│   session.dispatch('event.type', { data })                          │
│         │                                                           │
│         ▼                                                           │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │                    Session                               │       │
│   │  1. Append event to log                                  │       │
│   │  2. Invalidate cached state                              │       │
│   │  3. Notify all listeners                                 │       │
│   └─────────────────────────────────────────────────────────┘       │
│         │                                                           │
│         ▼                                                           │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │              Listeners (subscribed callbacks)            │       │
│   │                                                          │       │
│   │  storage.js  → saveSession(), saveAudioChunks()          │       │
│   │  audio.js    → startRecording(), stopRecording()         │       │
│   │  app.js      → renderCurrentScreen(), navigate()         │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Side Effect Co-location

Side effects are handled by the module responsible for that concern:

```javascript
// storage.js — subscribes to persist on any event
session.subscribe((event, state) => {
  saveSession(session.serialize());
  if (event.type === 'coding.code_changed') {
    saveAudioChunks(state.id, audioChunks);
  }
});

// audio.js — subscribes to control recording
session.subscribe((event, state) => {
  if (event.type === 'coding.started') {
    startRecording();
  }
  if (event.type === 'session.ended') {
    stopRecording();
  }
});

// app.js — subscribes to update UI
session.subscribe((event, state) => {
  renderCurrentScreen(state);
  if (state.phase !== currentPhase) {
    navigate('/' + state.phase.toLowerCase());
    currentPhase = state.phase;
  }
});
```

### Timer Handling

Timer display uses `setInterval` (not events) to avoid log bloat. Only phase transitions are events:

```javascript
// app.js — timer display loop
setInterval(() => {
  const state = session.getState();
  renderTimer(state.remainingTime);
  
  // Check for phase transitions
  if (state.phase === 'PREP' && state.remainingTime <= 0) {
    session.dispatch('prep.time_expired', {});
  }
  if (state.phase === 'CODING' && state.remainingTime <= 0) {
    session.dispatch('coding.silent_started', {});
  }
  if (state.phase === 'SILENT' && state.remainingTime <= 0) {
    session.dispatch('session.ended', {});
  }
}, 1000);
```

Time remaining is computed dynamically in `_deriveState()`:

```javascript
_deriveState() {
  // ... replay events to get phase start times ...
  
  const now = Date.now();
  if (state.phase === 'PREP') {
    state.remainingTime = PREP_DURATION - (now - state.prepStartTime);
  } else if (state.phase === 'CODING') {
    state.remainingTime = CODING_DURATION - (now - state.codingStartTime);
  } else if (state.phase === 'SILENT') {
    state.remainingTime = SILENT_DURATION - (now - state.silentStartTime);
  }
  
  return state;
}
```

### Event Types

| Event | When Dispatched | Data |
|-------|-----------------|------|
| `session.started` | User clicks "Start Session" | `{ problem }` |
| `prep.invariants_changed` | User types in invariants (debounced) | `{ invariants }` |
| `prep.time_expired` | Prep timer reaches 0 | `{}` |
| `coding.started` | User clicks "Start Coding" or prep time forces transition | `{}` |
| `coding.code_changed` | User types in code editor (debounced) | `{ code }` |
| `nudge.requested` | User clicks "Request Nudge" | `{}` |
| `coding.silent_started` | Coding timer reaches 0, entering silent phase | `{}` |
| `session.ended` | Silent timer reaches 0 | `{}` |
| `audio.started` | Audio recording begins | `{}` |
| `audio.stopped` | Audio recording ends | `{}` |
| `audio.permission_denied` | User denies microphone permission | `{}` |

---

## Storage (IndexedDB)

Using IndexedDB for all persistence (replaces localStorage). Benefits:

- **Non-blocking** — async API doesn't freeze UI
- **Large storage** — can store audio blobs (50MB+)
- **Native objects** — no JSON stringify/parse overhead
- **Full recovery** — sessions and audio can be restored on refresh

### Object Stores

| Store | Key | Contents |
|-------|-----|----------|
| `sessions` | `id` | Session object (events, problem, code, invariants) |
| `audio` | `sessionId` | Audio chunks array (Blob[]) |

### Wrapper API

```javascript
// storage.js
async function initStorage()
async function saveSession(session)
async function getSession(id)
async function getCurrentSession()
async function saveAudioChunks(sessionId, chunks)
async function getAudioChunks(sessionId)
async function clearSession(id)
```

---

## Session Recovery

### Tab Close Warning

Using `beforeunload` to warn users before leaving mid-session:

```javascript
window.addEventListener('beforeunload', (e) => {
  if (sessionInProgress()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
```

Note: Browser shows generic message (cannot customize).

### Recovery Flow

```
┌─────────────────────────────────────────┐
│  Page Load                              │
│         │                               │
│         ▼                               │
│  await initStorage()                    │
│         │                               │
│         ▼                               │
│  existing = await getCurrentSession()   │
│         │                               │
│         ├── null ──────► Show Start     │
│         │                               │
│         └── exists ───► Show Resume     │
│                         Modal           │
└─────────────────────────────────────────┘
```

### Resume Modal

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   Session in progress detected                              │
│                                                             │
│   Your code, invariants, and audio can be restored.         │
│                                                             │
│   ┌─────────────┐    ┌─────────────┐                        │
│   │   Resume    │    │   Abandon   │                        │
│   └─────────────┘    └─────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Zip Export

### Flow

```
1. Collect data (code, invariants, events, audio blob)
           │
           ▼
2. JSZip creates zip in memory
   ┌────────────────────────────────────────┐
   │  zip.file("code.py", codeString)       │
   │  zip.file("invariants.txt", invString) │
   │  zip.file("session.json", jsonString)  │
   │  zip.file("audio.webm", audioBlob)     │
   │  zip.file("summary.md", summaryString) │
   │  zip.file("problem.md", problemString) │
   └────────────────────────────────────────┘
           │
           ▼
3. Generate zip as Blob
   zip.generateAsync({ type: "blob" })
           │
           ▼
4. Trigger download
   URL.createObjectURL(blob) + <a download>
           │
           ▼
5. Browser saves session-{id}.zip
```

### JSZip Loading

Local vendor copy for offline use:

```html
<script src="js/vendor/jszip.min.js"></script>
```

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session ID | Short random (`Math.random().toString(36).slice(2, 8)`) | Human-readable, sufficient entropy for local app |
| Code change tracking | Debounced events (2-3s inactivity) | Captures intent without noise |
| Timer display | MM:SS format | Clean, less stressful than showing milliseconds |
| Problem selection | Pure random | Simple for MVP; repeats expected with small problem set |
| Error handling | Graceful degradation | Mic denied → continue without audio; show user-friendly messages |

---

## Dependencies

| Package | Purpose | Where |
|---------|---------|-------|
| `typescript` | Compile core engine | Dev |
| `jszip` | Bundle export (local vendor copy) | Web (runtime, `web/js/vendor/`) |

---

## Implementation Order

| # | Task | Scope |
|---|------|-------|
| 1 | Core types & event log | `core/` |
| 2 | Session state machine | `core/` |
| 3 | Timer logic | `core/` |
| 4 | Nudge system | `core/` |
| 5 | Summary generator | `core/` |
| 6 | Build setup (tsconfig, package.json) | `core/` |
| 7 | HTML structure & CSS | `web/` |
| 8 | Router (hash-based) | `web/` |
| 9 | UI constants & utilities | `web/` |
| 10 | Reusable components | `web/` |
| 11 | Screen modules | `web/` |
| 12 | Modals | `web/` |
| 13 | App controller (app.js) | `web/` |
| 14 | Hardcoded problems | `web/` |
| 15 | Audio recording | `web/` |
| 16 | IndexedDB storage | `web/` |
| 17 | Session recovery flow | `web/` |
| 18 | Zip export | `web/` |
| 19 | Integration & testing | All |

---

## Development

### Prerequisites

- Node.js (for TypeScript compilation)
- Python 3 (for dev server)

### Project Structure (Build Output)

```
InterviewDeck/
├── core/
│   ├── src/           # TypeScript source
│   ├── dist/          # Compiled JS output
│   └── package.json
├── web/
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   ├── router.js
│   │   ├── audio.js
│   │   ├── storage.js
│   │   ├── export.js
│   │   ├── lib/
│   │   │   └── core.js
│   │   ├── vendor/
│   │   │   └── jszip.min.js
│   │   ├── problems/
│   │   │   └── problems.js
│   │   └── ui/
│   │       ├── index.js
│   │       ├── constants.js
│   │       ├── components/
│   │       ├── screens/
│   │       └── modals/
└── package.json       # Root workspace
```

### Commands

```bash
npm install          # Install dependencies (once)
npm run build        # Compile core + copy to web/js/lib/
npm run dev          # Build + start server at localhost:8000
```

### Dev Workflow

1. Edit core TypeScript in `core/src/` -> run `npm run build`
2. Edit web JS/CSS -> just refresh browser
3. Open http://localhost:8000

### Why Not `file://`?

Browsers block ES module imports over `file://` protocol due to CORS restrictions. A simple HTTP server is required. We use Python's built-in server for zero additional dependencies:

```bash
python3 -m http.server 8000 -d web
```

### Build Scripts (Root package.json)

```json
{
  "scripts": {
    "build:core": "cd core && npm run build",
    "copy:core": "cp core/dist/* web/js/lib/",
    "build": "npm run build:core && npm run copy:core",
    "dev": "npm run build && python3 -m http.server 8000 -d web"
  }
}
```
