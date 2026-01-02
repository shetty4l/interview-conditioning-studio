# Interview Conditioning Studio

> Local-first interview practice tool with enforced constraints, time pressure, and no pass/fail judgment.

## What is this?

Interview Conditioning Studio (ICS) helps engineers build interview-relevant behaviors through deliberate practice. Unlike LeetCode-style tools, ICS focuses on *conditioning* — time management, problem framing, articulating reasoning, and recovering from stuck points — not correctness evaluation.

See [Product Principles](docs/PRINCIPLES.md) for core design invariants.

## Features

- **Timed sessions**: Multiple presets (Standard, High Pressure, No Assistance)
- **Enforced invariants**: Write down your assumptions before coding
- **Limited nudges**: Budget depends on preset — use them wisely
- **Mandatory reflection**: Self-assess after each session
- **Audio recording**: Capture your verbal reasoning for self-review
- **Session export**: Download a bundle for LLM-assisted analysis
- **Historical tracking**: See deltas vs your last session
- **100% client-side**: Your data never leaves your browser

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
