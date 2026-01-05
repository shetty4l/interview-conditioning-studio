/**
 * SummaryScreen Component
 *
 * Session summary with:
 * - Header showing frozen timer (time remaining when submitted)
 * - Metrics row at top (Time spent, Nudges, Problem title)
 * - Collapsible sections: Problem, Invariants, Solution
 * - Continue to Reflection button
 */

import { div, h1, span, Show, useActions, useStore } from "../framework";
import { Button, CollapsibleSection, PhaseHeader } from "../components";
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

  // Calculate actual time spent from session timestamps
  const getActualTimeSpent = () => {
    const session = state.session();
    if (!session) return 0;

    const sessionState = session.getState();
    const now = Date.now();

    // Prep time: from session start to coding start
    const prepTime = sessionState.prepTimeUsed ?? 0;

    // Coding time: from coding start to now (we're on summary screen)
    // If codingStartedAt exists, calculate time spent coding
    let codingTime = 0;
    if (sessionState.codingStartedAt) {
      codingTime = now - sessionState.codingStartedAt;
    }

    return prepTime + codingTime;
  };

  return div({ class: "screen summary-screen", id: "summary-screen" }, [
    // Header with frozen timer (shows time remaining when submitted)
    PhaseHeader({
      phase: "summary",
      remainingMs: state.remainingMs,
    }),

    // Main content
    div({ class: "summary-content" }, [
      h1({}, ["Session Complete"]),

      // Metrics row
      div({ class: "summary-metrics" }, [
        // Actual Time Spent
        div({ class: "summary-metric" }, [
          span({ class: "summary-metric__value" }, [() => formatTime(getActualTimeSpent())]),
          span({ class: "summary-metric__label" }, ["Time Spent"]),
        ]),

        // Nudges Used
        div({ class: "summary-metric" }, [
          span({ class: "summary-metric__value" }, [
            () => `${state.nudgesUsed()}/${state.nudgesAllowed()}`,
          ]),
          span({ class: "summary-metric__label" }, ["Nudges"]),
        ]),

        // Problem
        div({ class: "summary-metric summary-metric--wide" }, [
          span({ class: "summary-metric__value summary-metric__value--text" }, [
            () => state.problem()?.title || "Unknown",
          ]),
          span({ class: "summary-metric__label" }, ["Problem"]),
        ]),
      ]),

      // Collapsible sections
      div({ class: "summary-sections" }, [
        // Problem Description
        Show(
          () => state.problem() !== null,
          () =>
            CollapsibleSection({
              title: "Problem Description",
              children: div({ class: "problem-description" }, [state.problem()!.description]),
              defaultCollapsed: true,
            }),
        ),

        // Invariants
        Show(
          () => state.invariants().length > 0,
          () =>
            CollapsibleSection({
              title: "Your Invariants",
              children: state.invariants(),
              defaultCollapsed: false,
            }),
        ),

        // Solution
        CollapsibleSection({
          title: "Your Solution",
          children: div({ class: "code-block" }, [() => state.code() || "(No code submitted)"]),
          defaultCollapsed: false,
        }),
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
