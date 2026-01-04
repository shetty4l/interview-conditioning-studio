/**
 * StatsCard Component
 *
 * Dashboard stat display with value and label.
 */

import { div, span } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface StatsCardProps {
  value: string | number | (() => string | number);
  label: string;
  variant?: "default" | "success" | "warning";
}

// ============================================================================
// Component
// ============================================================================

export function StatsCard(props: StatsCardProps): HTMLElement {
  const { value, label, variant = "default" } = props;

  const getValue = typeof value === "function" ? value : () => value;

  return div({ class: `stats-card stats-card--${variant}` }, [
    span({ class: "stats-card__value" }, [getValue]),
    span({ class: "stats-card__label" }, [label]),
  ]);
}
