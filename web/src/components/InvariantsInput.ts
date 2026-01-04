/**
 * InvariantsInput Component
 *
 * Textarea for invariants input during prep phase.
 */

import { div, textarea, h3, p } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface InvariantsInputProps {
  value: string | (() => string);
  onChange: (value: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function InvariantsInput(props: InvariantsInputProps): HTMLElement {
  const { value, onChange } = props;

  const getValue = typeof value === "function" ? value : () => value;

  return div(
    {
      class: "invariants-section",
    },
    [
      h3({}, ["Invariants"]),
      p({ class: "hint" }, [
        "Write down key assumptions, edge cases, and constraints before coding.",
      ]),
      textarea(
        {
          id: "invariants",
          class: "invariants-input",
          placeholder:
            "- What are the input constraints?\n- What edge cases should I handle?\n- What assumptions am I making?",
          value: getValue,
          onInput: (e: Event) => {
            const target = e.target as HTMLTextAreaElement;
            onChange(target.value);
          },
        },
        [],
      ),
    ],
  );
}
