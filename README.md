# Interview Conditioning Studio

> Local-first interview practice tool with enforced constraints, time pressure, and no pass/fail judgment.

## Try It

**[Launch Interview Conditioning Studio](https://interview-conditioning-studio.pages.dev)**

No installation required — runs entirely in your browser.

## What is this?

Interview Conditioning Studio (ICS) helps engineers build interview-relevant behaviors through deliberate practice. Unlike LeetCode-style tools, ICS focuses on _conditioning_ — time management, problem framing, articulating reasoning, and recovering from stuck points — not correctness evaluation.

See [Product Principles](docs/PRINCIPLES.md) for core design invariants.

## Features

- **Dashboard**: View session history, stats, and resume incomplete sessions
- **Timed sessions**: Multiple presets (Speed Round, Standard, High Pressure, No Assistance)
- **Pre-session mic check**: Verify your microphone works before starting
- **Enforced invariants**: Write down your assumptions before coding
- **Limited nudges**: Budget depends on preset — use them wisely
- **Silent phase**: Final minutes with no assistance
- **Pause/resume**: Handle interruptions without losing progress
- **Mandatory reflection**: Self-assess after each session
- **Audio recording**: Capture your verbal reasoning for self-review
- **Session export**: Download a bundle for LLM-assisted analysis (see [Export Details](docs/USAGE.md))
- **100% client-side**: Your data never leaves your browser

## How It Works

1. **Dashboard** — View past sessions and stats, or start a new session
2. **Choose a preset** — Speed Round, Standard, High Pressure, or No Assistance
3. **Mic check** — Verify your microphone is working (optional)
4. **Run a constrained session** — Prep → Coding → Silent phases with enforced time limits
5. **Complete mandatory reflection** — 5 quick self-assessment prompts
6. **Review and export** — View your session or download for LLM-assisted review

The goal is not to get the answer right — it's to build comfort with interview pressure through repeated exposure.

## What This Is (and Isn't)

**This is:**

- A conditioning tool for interview pressure
- Enforced constraints (time, nudges, silence)
- Self-reflection and behavioral tracking

**This is not:**

- A leetcode alternative
- A correctness checker
- An AI interviewer or tutor

## Quick Start (Local Development)

Or just [use the hosted version](https://interview-conditioning-studio.pages.dev).

```bash
./scripts/bootstrap.sh
source scripts/activate
bun run serve
```

Open http://localhost:8000

## Development

```bash
bun run build        # Build for production
bun run serve        # Start dev server at localhost:8000
bun run typecheck    # Type check
bun run lint         # Lint with oxlint
bun run format       # Format with oxfmt
bun run test         # Run unit tests
bun run test:e2e     # Run Playwright E2E tests
bun run preflight    # Run all checks (build + format + typecheck + lint + test)
```

## License

[MIT](LICENSE)
