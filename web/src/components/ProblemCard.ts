/**
 * ProblemCard Component
 *
 * Displays problem title and description, optionally collapsible.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface ProblemCardProps {
  /** Problem title */
  title: string;
  /** Problem description */
  description: string;
  /** Whether the card is collapsible */
  collapsible?: boolean;
  /** Whether collapsed (only used if collapsible=true) */
  collapsed?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === ProblemCard === */
.problem-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.problem-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  background-color: var(--color-surface);
}

.problem-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
  margin: 0;
}

.problem-card__toggle {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: var(--space-xs);
  font-size: 1rem;
  transition: transform 0.2s ease;
}

.problem-card__toggle:hover {
  color: var(--color-text);
}

.problem-card--collapsed .problem-card__toggle {
  transform: rotate(-90deg);
}

.problem-card__body {
  padding: 0 var(--space-lg) var(--space-lg);
}

.problem-card--collapsed .problem-card__body {
  display: none;
}

.problem-card__description {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--color-text);
  margin: 0;
  max-height: 300px;
  overflow-y: auto;
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: ProblemCardProps): string {
  const { title, description, collapsible = false, collapsed = false } = props;

  const collapsedClass = collapsed ? " problem-card--collapsed" : "";

  const toggleButton = collapsible
    ? `<button class="problem-card__toggle" data-toggle-problem aria-label="Toggle problem">&#9660;</button>`
    : "";

  return `
    <div 
      class="problem-card${collapsedClass}" 
      data-component="${COMPONENTS.PROBLEM_CARD}"
    >
      <div class="problem-card__header">
        <h2 class="problem-card__title">${escapeHtml(title)}</h2>
        ${toggleButton}
      </div>
      <div class="problem-card__body">
        <pre class="problem-card__description">${escapeHtml(description)}</pre>
      </div>
    </div>
  `;
}

// ============================================================================
// Mount
// ============================================================================

export function mount(element: HTMLElement): () => void {
  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-toggle-problem]")) {
      element.classList.toggle("problem-card--collapsed");
    }
  };

  element.addEventListener("click", handleClick);

  return () => {
    element.removeEventListener("click", handleClick);
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
