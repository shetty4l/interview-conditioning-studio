# Usage Guide

## Session Flow

Each session follows a fixed structure:

| Phase          | Duration                  | What Happens                                     |
| -------------- | ------------------------- | ------------------------------------------------ |
| **Prep**       | 5 min (varies by preset)  | Read problem, write invariants/assumptions       |
| **Coding**     | 35 min (varies by preset) | Write solution, audio recorded, nudges available |
| **Silent**     | 5 min (varies by preset)  | Continue coding, no nudges, audio continues      |
| **Summary**    | —                         | Review stats and behavioral signals              |
| **Reflection** | ~60 seconds               | Answer 5 self-assessment prompts                 |
| **Done**       | —                         | Export bundle, start new session                 |

## Session Presets

| Preset            | Prep  | Coding | Silent | Nudges | Intent                          |
| ----------------- | ----- | ------ | ------ | ------ | ------------------------------- |
| **Standard**      | 5 min | 35 min | 5 min  | 3      | Default experience              |
| **High Pressure** | 3 min | 25 min | 2 min  | 1      | Time compression + limited help |
| **No Assistance** | 5 min | 35 min | 5 min  | 0      | Full time, no nudges            |

## Export Bundle

After completing a session, you can download a `.tar.gz` bundle containing:

| File             | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| `session.json`   | Structured session data (timing, metrics, events) |
| `code.txt`       | Your final code                                   |
| `invariants.txt` | Your pre-coding notes and assumptions             |
| `audio.webm`     | Voice recording (if microphone was enabled)       |

The bundle filename follows the pattern: `{problem-slug}-{YYYY-MM-DD}.tar.gz`

## Using the Export with an LLM

The export bundle can be fed to an LLM (Claude, GPT, etc.) for personalized feedback. Upload the files and ask for analysis on:

1. **Problem Understanding** — Did the invariants capture key constraints?
2. **Approach** — Was the strategy sound and articulated before coding?
3. **Execution** — How was progress managed under time pressure?
4. **Recovery** — If stuck, how did the candidate respond?
5. **Self-Awareness** — Do reflection responses align with observable behavior?
6. **Recommendations** — What should the candidate focus on improving?

### Example Workflow

1. Complete a session
2. Download the export bundle (`.tar.gz`)
3. Extract and upload files to your preferred LLM
4. Ask the LLM to analyze your session data and code
5. Review feedback and identify patterns across multiple sessions

The LLM has access to both objective signals (timing, nudge usage, code changes) and your self-assessment in `session.json`, allowing it to identify blind spots or confirm accurate self-awareness.

## Behavioral Signals

The system captures objective signals for self-review:

| Signal             | What It Measures                                  |
| ------------------ | ------------------------------------------------- |
| **Prep time used** | How much of prep phase you used before coding     |
| **Nudges used**    | How many hints you requested (and when)           |
| **Nudge timing**   | Whether nudges were early, mid, or late in coding |
| **Code changes**   | Number of edits during coding and silent phases   |
| **Phase overruns** | Whether you exceeded any phase time limits        |

These signals are descriptive, not evaluative. The system observes behavior without judging correctness.

## Historical Comparison

On the start screen, you'll see a comparison to your last completed session:

```
Last session: 2 nudges • 4:12 prep time
```

This provides context for your current session without judgment or scoring.
