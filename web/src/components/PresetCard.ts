/**
 * PresetCard Component
 *
 * Selectable card for choosing a session preset.
 */

import { COMPONENTS, ACTIONS } from "../constants";
import type { Preset } from "../../../core/src/index";

// ============================================================================
// Types
// ============================================================================

export interface PresetCardProps {
  /** Preset identifier */
  preset: Preset;
  /** Display label */
  label: string;
  /** Description text */
  description: string;
  /** Whether this preset is currently selected */
  selected?: boolean;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === PresetCard === */
.preset-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  padding: var(--space-lg);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
  width: 100%;
}

.preset-card:hover {
  border-color: var(--color-primary);
  background-color: var(--color-surface-hover);
}

.preset-card--selected {
  border-color: var(--color-primary);
  background-color: rgba(59, 130, 246, 0.1);
}

.preset-card__label {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--space-xs);
  color: var(--color-text);
}

.preset-card__description {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: PresetCardProps): string {
  const { preset, label, description, selected = false } = props;

  const selectedClass = selected ? " preset-card--selected" : "";

  return `
    <button
      class="preset-card${selectedClass}"
      data-component="${COMPONENTS.PRESET_CARD}"
      data-action="${ACTIONS.SELECT_PRESET}"
      data-preset="${preset}"
    >
      <span class="preset-card__label">${escapeHtml(label)}</span>
      <span class="preset-card__description">${escapeHtml(description)}</span>
    </button>
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
