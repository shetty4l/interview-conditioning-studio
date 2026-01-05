/**
 * CollapsibleSection Component
 *
 * A reusable collapsible section with chevron toggle.
 * Used for Problem, Invariants, and Solution sections in two-column layouts.
 */

import { div, span, signal, Show } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface CollapsibleSectionProps {
  /** Section title displayed in header */
  title: string;
  /** Content to display when expanded (can be string or HTMLElement) */
  children: HTMLElement | string;
  /** Whether section starts collapsed (default: false) */
  defaultCollapsed?: boolean;
  /** Additional CSS class for the container */
  className?: string;
  /** Variant styling: "default" | "compact" */
  variant?: "default" | "compact";
}

// ============================================================================
// Component
// ============================================================================

export function CollapsibleSection(props: CollapsibleSectionProps): HTMLElement {
  const { title, children, defaultCollapsed = false, className = "", variant = "default" } = props;

  const [collapsed, setCollapsed] = signal(defaultCollapsed);

  const toggleCollapse = () => {
    setCollapsed(!collapsed());
  };

  const variantClass = variant === "compact" ? "collapsible--compact" : "";
  const classes = ["collapsible", variantClass, className].filter(Boolean).join(" ");

  // Render content based on type
  const renderContent = (): HTMLElement => {
    if (typeof children === "string") {
      return div({ class: "collapsible__text" }, [children]);
    }
    return children;
  };

  return div(
    {
      class: () => `${classes}${collapsed() ? " collapsible--collapsed" : ""}`,
    },
    [
      // Header (clickable)
      div(
        {
          class: "collapsible__header",
          onClick: toggleCollapse,
        },
        [
          span(
            {
              class: () =>
                `collapsible__chevron${collapsed() ? " collapsible__chevron--collapsed" : ""}`,
            },
            [],
          ),
          span({ class: "collapsible__title" }, [title]),
        ],
      ),
      // Content (shown when not collapsed)
      Show(
        () => !collapsed(),
        () => div({ class: "collapsible__content" }, [renderContent()]),
      ),
    ],
  );
}
