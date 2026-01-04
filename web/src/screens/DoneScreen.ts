/**
 * DoneScreen Component
 *
 * Final screen with export and new session options.
 */

import { div, h1, p, useStore, useActions, useRouter } from "../framework";
import { PhaseHeader, Button, showToast } from "../components";
import { AppStore } from "../store";

// ============================================================================
// Component
// ============================================================================

export function DoneScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);
  const router = useRouter();

  const handleExport = async () => {
    try {
      await actions.exportSession();
      showToast("Session exported successfully", "success");
    } catch {
      showToast("Export failed", "error");
    }
  };

  const handleNewSession = () => {
    actions.resetApp();
    router.navigate("/new");
  };

  return div({ class: "screen done-screen", id: "done-screen" }, [
    // Header
    PhaseHeader({
      phase: "done",
      remainingMs: 0,
    }),

    // Main content
    div({ class: "screen-content done-content" }, [
      div({ class: "done-message" }, [
        h1({}, ["Session Complete!"]),
        p({}, ["Great work! You've completed your practice session."]),
        p({ class: "problem-name" }, [() => `Problem: ${state.problem()?.title || "Unknown"}`]),
      ]),

      // Actions
      div({ class: "done-actions" }, [
        Button({
          label: "Export Session",
          variant: "primary",
          size: "large",
          action: "export-session",
          onClick: handleExport,
        }),
        Button({
          label: "Start New Session",
          variant: "secondary",
          size: "large",
          action: "new-session",
          onClick: handleNewSession,
        }),
      ]),
    ]),
  ]);
}
