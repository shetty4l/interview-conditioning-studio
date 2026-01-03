/**
 * InvariantsDisplay Component
 *
 * Read-only display of invariants/notes.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface InvariantsDisplayProps {
  /** Invariants text to display */
  value: string;
  /** Label text */
  label?: string;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === InvariantsDisplay === */
.invariants-display {
  background-color: var(--color-surface);
  padding: var(--space-md);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.875rem;
  white-space: pre-wrap;
  color: var(--color-text-muted);
  max-height: 150px;
  overflow-y: auto;
}

.invariants-display--empty {
  font-style: italic;
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: InvariantsDisplayProps): string {
  const { value } = props;

  const isEmpty = !value || value.trim() === "";
  const displayText = isEmpty ? "(no invariants)" : value;
  const emptyClass = isEmpty ? " invariants-display--empty" : "";

  return `
    <div 
      class="invariants-display${emptyClass}" 
      data-component="${COMPONENTS.INVARIANTS_DISPLAY}"
    >${escapeHtml(displayText)}</div>
  `;
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
