/**
 * InvariantsInput Component
 *
 * Textarea for invariants input during prep phase.
 */

import { div, h3, p, textarea } from "../framework";

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
          onKeyDown: (e: KeyboardEvent) => {
            // Handle Tab key - insert 2 spaces instead of tab character
            if (e.key === "Tab") {
              e.preventDefault();
              const target = e.target as HTMLTextAreaElement;
              const start = target.selectionStart;
              const end = target.selectionEnd;
              const currentValue = target.value;
              const newValue =
                currentValue.substring(0, start) + "  " + currentValue.substring(end);
              target.value = newValue;
              target.selectionStart = target.selectionEnd = start + 2;
              onChange(newValue);
            }
          },
        },
        [],
      ),
    ],
  );
}
