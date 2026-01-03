# Interview Conditioning Studio

> Local-first interview practice tool with enforced constraints, time pressure, and no pass/fail judgment.

## What is this?

Interview Conditioning Studio (ICS) helps engineers build interview-relevant behaviors through deliberate practice. Unlike LeetCode-style tools, ICS focuses on _conditioning_ — time management, problem framing, articulating reasoning, and recovering from stuck points — not correctness evaluation.

See [Product Principles](docs/PRINCIPLES.md) for core design invariants.

## Features

- **Timed sessions**: Multiple presets (Standard, High Pressure, No Assistance)
- **Enforced invariants**: Write down your assumptions before coding
- **Limited nudges**: Budget depends on preset — use them wisely
- **Silent phase**: Final minutes with no assistance — practice concluding without external help
- **Mandatory reflection**: Self-assess after each session
- **Audio recording**: Capture your verbal reasoning for self-review
- **Session export**: Download a bundle for LLM-assisted analysis (see [Export Details](docs/USAGE.md))
- **Historical tracking**: See deltas vs your last session
- **100% client-side**: Your data never leaves your browser

## How It Works

1. **Choose a preset** — Standard, High Pressure, or No Assistance
2. **Run a constrained session** — Prep → Coding → Silent phases with enforced time limits
3. **Complete mandatory reflection** — 5 quick self-assessment prompts (~60 seconds)
4. **Review behavioral signals** — See objective metrics and comparison to your last session
5. **Export for deeper analysis** — Download a bundle for LLM-assisted review or self-study

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

## Quick Start

```bash
./scripts/bootstrap.sh
source scripts/activate
bun run dev
```

Open http://localhost:8000

## Development

```bash
bun run build        # Build core engine
bun run build:watch  # Build with watch mode
bun run typecheck    # Type check
bun run test         # Run tests
bun run serve        # Start dev server
bun run dev          # Build + serve
```

## License

[MIT](LICENSE)
