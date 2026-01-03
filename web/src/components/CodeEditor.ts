/**
 * CodeEditor Component
 *
 * Textarea for writing code with cursor position preservation on updates.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface CodeEditorProps {
  /** Current code value */
  value: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether editor is disabled */
  disabled?: boolean;
  /** Optional ID for the textarea */
  id?: string;
}

export interface CodeEditorHandlers {
  onChange: (value: string) => void;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === CodeEditor === */
.code-editor {
  width: 100%;
  min-height: 400px;
  padding: var(--space-md);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.5;
  tab-size: 2;
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
}

.code-editor:focus {
  outline: none;
  border-color: var(--color-primary);
}

.code-editor:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.code-editor::placeholder {
  color: var(--color-text-muted);
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: CodeEditorProps): string {
  const { value, placeholder = "Write your solution here...", disabled = false, id } = props;

  const idAttr = id ? ` id="${id}"` : "";
  const disabledAttr = disabled ? " disabled" : "";

  return `
    <textarea
      class="code-editor"
      data-component="${COMPONENTS.CODE_EDITOR}"
      placeholder="${escapeAttr(placeholder)}"
      spellcheck="false"${idAttr}${disabledAttr}
    >${escapeHtml(value)}</textarea>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(element: HTMLElement, handlers: CodeEditorHandlers): () => void {
  const textarea = element as HTMLTextAreaElement;

  const handleInput = () => {
    handlers.onChange(textarea.value);
  };

  // Support Tab key for indentation
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert tab character (2 spaces)
      const indent = "  ";
      textarea.value = textarea.value.substring(0, start) + indent + textarea.value.substring(end);

      // Move cursor
      textarea.selectionStart = textarea.selectionEnd = start + indent.length;

      // Trigger change handler
      handlers.onChange(textarea.value);
    }
  };

  textarea.addEventListener("input", handleInput);
  textarea.addEventListener("keydown", handleKeydown);

  return () => {
    textarea.removeEventListener("input", handleInput);
    textarea.removeEventListener("keydown", handleKeydown);
  };
}

// ============================================================================
// Update (cursor-preserving)
// ============================================================================

/**
 * Update the code editor value while preserving cursor position.
 * Use this for external updates (e.g., from state sync).
 */
export function update(element: HTMLElement, props: CodeEditorProps): void {
  const textarea = element as HTMLTextAreaElement;

  // Only update if value changed
  if (textarea.value === props.value) return;

  // Save cursor position
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  // Update value
  textarea.value = props.value;

  // Restore cursor position (clamped to new value length)
  const maxPos = props.value.length;
  textarea.selectionStart = Math.min(start, maxPos);
  textarea.selectionEnd = Math.min(end, maxPos);
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
