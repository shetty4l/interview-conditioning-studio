# Interview Conditioning Studio

> Local-first interview practice tool with enforced constraints, time pressure, and no pass/fail judgment.

## What is this?

Interview Conditioning Studio (ICS) helps engineers build interview-relevant behaviors through deliberate practice. Unlike LeetCode-style tools, ICS focuses on *conditioning* — time management, problem framing, articulating reasoning, and recovering from stuck points — not correctness evaluation.

## Features

- **45-minute timed sessions**: 5 min prep → 35 min coding → 5 min silent
- **Enforced invariants**: Write down your assumptions before coding
- **Limited nudges**: Only 3 allowed — use them wisely
- **Audio recording**: Capture your verbal reasoning for self-review
- **Session export**: Download a bundle for LLM-assisted analysis
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
