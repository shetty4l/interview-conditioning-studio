/**
 * InvariantsInput Component
 *
 * Textarea for entering invariants/notes during prep phase.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface InvariantsInputProps {
  /** Current value */
  value: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether input is disabled */
  disabled?: boolean;
  /** Optional ID for the textarea */
  id?: string;
}

export interface InvariantsInputHandlers {
  onChange: (value: string) => void;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === InvariantsInput === */
.invariants-input {
  width: 100%;
  min-height: 150px;
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.5;
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
}

.invariants-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.invariants-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.invariants-input::placeholder {
  color: var(--color-text-muted);
}
`;

// ============================================================================
// Render
// ============================================================================

const DEFAULT_PLACEHOLDER = `- Input constraints
- Edge cases to consider
- Initial approach...`;

export function render(props: InvariantsInputProps): string {
  const { value, placeholder = DEFAULT_PLACEHOLDER, disabled = false, id } = props;

  const idAttr = id ? ` id="${id}"` : "";
  const disabledAttr = disabled ? " disabled" : "";

  return `
    <textarea
      class="invariants-input"
      data-component="${COMPONENTS.INVARIANTS_INPUT}"
      placeholder="${escapeAttr(placeholder)}"${idAttr}${disabledAttr}
    >${escapeHtml(value)}</textarea>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(element: HTMLElement, handlers: InvariantsInputHandlers): () => void {
  const textarea = element as HTMLTextAreaElement;

  const handleInput = () => {
    handlers.onChange(textarea.value);
  };

  textarea.addEventListener("input", handleInput);

  return () => {
    textarea.removeEventListener("input", handleInput);
  };
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
