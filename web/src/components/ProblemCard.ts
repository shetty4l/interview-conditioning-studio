/**
 * ProblemCard Component
 *
 * Displays problem title and description, collapsible.
 */

import { div, h2, Show, signal } from "../framework";
import type { Problem } from "../problems";

// ============================================================================
// Types
// ============================================================================

export interface ProblemCardProps {
  problem: Problem;
  collapsible?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function ProblemCard(props: ProblemCardProps): HTMLElement {
  const { problem, collapsible = false } = props;
  const [collapsed, setCollapsed] = signal(false);

  const toggleCollapse = () => {
    if (collapsible) {
      setCollapsed(!collapsed());
    }
  };

  return div(
    {
      class: "problem-section",
    },
    [
      h2(
        {
          style: collapsible ? "cursor: pointer;" : "",
          onClick: toggleCollapse,
        },
        [problem.title, collapsible ? (collapsed() ? " ▶" : " ▼") : ""],
      ),
      Show(
        () => !collapsible || !collapsed(),
        () =>
          div(
            {
              class: "problem-description",
            },
            [problem.description],
          ),
      ),
    ],
  );
}
