/**
 * PresetCard Component
 *
 * Clickable card for preset selection on home screen.
 * Uses a button element for accessibility.
 */

import { button, span } from "../framework";
import type { Preset } from "../../../core/src/index";

// ============================================================================
// Types
// ============================================================================

export interface PresetCardProps {
  preset: Preset;
  label: string;
  description: string;
  selected: boolean | (() => boolean);
  onClick: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function PresetCard(props: PresetCardProps): HTMLButtonElement {
  const { preset, label, description, selected, onClick } = props;

  const isSelected = typeof selected === "function" ? selected : () => selected;

  return button(
    {
      type: "button",
      class: () => (isSelected() ? "preset-card selected" : "preset-card"),
      "data-action": "select-preset",
      "data-preset": preset,
      onClick,
    },
    [span({ class: "preset-label" }, [label]), span({ class: "preset-desc" }, [description])],
  );
}
