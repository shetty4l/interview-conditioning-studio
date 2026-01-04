/**
 * HomeScreen Component
 *
 * Landing screen for selecting presets and starting sessions.
 * Shows resume banner if there's an incomplete session.
 */

import { div, h1, h2, p, Show, span, useActions, useRouter, useStore } from "../framework";
import { Button, ConfirmButton, PresetCard, showToast } from "../components";
import { AppStore, PresetEnum } from "../store";
import type { Preset } from "../../../core/src/index";

// ============================================================================
// Constants
// ============================================================================

const PRESETS: Array<{
  preset: Preset;
  label: string;
  description: string;
}> = [
  {
    preset: PresetEnum.Standard,
    label: "Standard",
    description: "5 min prep, 35 min coding, 5 min silent, 3 nudges",
  },
  {
    preset: PresetEnum.HighPressure,
    label: "High Pressure",
    description: "3 min prep, 25 min coding, 2 min silent, 1 nudge",
  },
  {
    preset: PresetEnum.NoAssistance,
    label: "No Assistance",
    description: "5 min prep, 35 min coding, 5 min silent, 0 nudges",
  },
];

// ============================================================================
// Component
// ============================================================================

export function HomeScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);
  const router = useRouter();

  const handleSelectPreset = (preset: Preset) => {
    actions.selectPreset(preset);
  };

  const handleStartSession = async () => {
    await actions.startSession();
    // Navigate to the session route
    const sessionId = AppStore.getSnapshot().sessionId;
    if (sessionId) {
      router.navigate(`/${sessionId}`);
    }
  };

  const handleResume = async () => {
    await actions.resumeSession();
    // Navigate to the session route
    const sessionId = AppStore.getSnapshot().sessionId;
    if (sessionId) {
      router.navigate(`/${sessionId}`);
    }
    showToast("Session resumed", "success");
  };

  const handleDiscard = async () => {
    await actions.discardIncompleteSession();
    showToast("Session discarded", "info");
  };

  return div({ class: "screen home-screen", id: "home-screen" }, [
    // Resume Banner
    Show(
      () => state.incompleteSession() !== null,
      () =>
        div({ class: "resume-banner" }, [
          div({ class: "resume-banner__content" }, [
            span({ class: "resume-banner__title" }, ["Continue Previous Session"]),
            span({ class: "resume-banner__info" }, [
              () => {
                const incomplete = state.incompleteSession();
                return `${incomplete?.problemTitle || ""} - ${incomplete?.phase || ""}`;
              },
            ]),
          ]),
          div({ class: "resume-banner__actions" }, [
            Button({
              label: "Resume",
              variant: "primary",
              action: "resume-session",
              onClick: handleResume,
            }),
            ConfirmButton({
              label: "Discard",
              confirmLabel: "Confirm Discard?",
              variant: "danger",
              action: "discard-session",
              onConfirm: handleDiscard,
            }),
          ]),
        ]),
    ),

    // Header
    div({ class: "home-header" }, [
      h1({}, ["Interview Conditioning Studio"]),
      p({ class: "subtitle" }, [
        "Practice technical interviews with timed constraints and limited assistance",
      ]),
    ]),

    // Preset Selection
    div({ class: "preset-section" }, [
      h2({}, ["Select Mode"]),
      div(
        { class: "preset-cards" },
        PRESETS.map((p) =>
          PresetCard({
            preset: p.preset,
            label: p.label,
            description: p.description,
            selected: () => state.selectedPreset() === p.preset,
            onClick: () => handleSelectPreset(p.preset),
          }),
        ),
      ),
    ]),

    // Start Button
    div({ class: "start-section" }, [
      Button({
        label: "Start Session",
        variant: "primary",
        size: "large",
        action: "start-session",
        className: "start-button",
        onClick: handleStartSession,
      }),
    ]),
  ]);
}
