/**
 * SummaryScreen Component
 *
 * Session summary with stats and continue button.
 */

import { div, h1, h2, span, useStore, useActions } from "../framework";
import { PhaseHeader, Button } from "../components";
import { AppStore } from "../store";
import { formatTime } from "../components/Timer";

// ============================================================================
// Component
// ============================================================================

export function SummaryScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);

  const handleContinue = async () => {
    await actions.continuePastSummary();
  };

  // Calculate session stats
  const getTotalTime = () => {
    const prep = state.prepDurationMs();
    const coding = state.codingDurationMs();
    return prep + coding;
  };

  return div({ class: "screen summary-screen", id: "summary-screen" }, [
    // Header (no timer in summary)
    PhaseHeader({
      phase: "summary",
      remainingMs: 0,
    }),

    // Main content
    div({ class: "screen-content summary-content" }, [
      h1({}, ["Session Complete"]),

      // Stats grid
      div({ class: "stats-grid" }, [
        // Total Time
        div({ class: "stat-card" }, [
          span({ class: "stat-label" }, ["Total Time"]),
          span({ class: "stat-value" }, [() => formatTime(getTotalTime())]),
        ]),

        // Nudges Used
        div({ class: "stat-card" }, [
          span({ class: "stat-label" }, ["Nudges Used"]),
          span({ class: "stat-value" }, [() => `${state.nudgesUsed()} / ${state.nudgesAllowed()}`]),
        ]),

        // Problem
        div({ class: "stat-card stat-card--wide" }, [
          span({ class: "stat-label" }, ["Problem"]),
          span({ class: "stat-value" }, [() => state.problem()?.title || "Unknown"]),
        ]),
      ]),

      // Code preview
      div({ class: "code-preview" }, [
        h2({}, ["Your Solution"]),
        div({ class: "code-preview__content" }, [() => state.code() || "(No code submitted)"]),
      ]),

      // Continue button
      div({ class: "summary-actions" }, [
        Button({
          label: "Continue to Reflection",
          variant: "primary",
          size: "large",
          action: "continue-to-reflection",
          onClick: handleContinue,
        }),
      ]),
    ]),
  ]);
}
