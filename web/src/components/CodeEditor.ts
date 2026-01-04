/**
 * CodeEditor Component
 *
 * Textarea for code input with Tab key handling.
 */

import { textarea } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface CodeEditorProps {
  value: string | (() => string);
  onChange: (value: string) => void;
  disabled?: boolean | (() => boolean);
}

// ============================================================================
// Component
// ============================================================================

export function CodeEditor(props: CodeEditorProps): HTMLTextAreaElement {
  const { value, onChange, disabled = false } = props;

  const getValue = typeof value === "function" ? value : () => value;
  const getDisabled = typeof disabled === "function" ? disabled : () => disabled;

  const handleKeyDown = (e: KeyboardEvent) => {
    // Handle Tab key - insert 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const currentValue = target.value;
      const newValue = currentValue.substring(0, start) + "  " + currentValue.substring(end);
      target.value = newValue;
      target.selectionStart = target.selectionEnd = start + 2;
      onChange(newValue);
    }
  };

  return textarea(
    {
      id: "code",
      class: "code-input",
      placeholder: "Write your solution here...",
      value: getValue,
      disabled: getDisabled,
      onInput: (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        onChange(target.value);
      },
      onKeyDown: handleKeyDown,
    },
    [],
  );
}
