/**
 * HomeScreen Component
 *
 * Landing screen for selecting presets and starting sessions.
 * Shows resume banner if there's an incomplete session.
 * Includes mic check if audio is supported.
 */

import {
  div,
  h1,
  h2,
  onMount,
  p,
  Show,
  signal,
  span,
  useActions,
  useRouter,
  useStore,
} from "../framework";
import {
  AppHeader,
  Button,
  ConfirmButton,
  MicCheck,
  PresetCard,
  showToast,
  type MicCheckState,
} from "../components";
import { AppStore, PresetEnum } from "../store";
import { preloadProblems } from "../problems";
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
    preset: PresetEnum.SpeedRound,
    label: "Speed Round",
    description: "2 min prep, 10 min coding, 2 min silent, 2 nudges",
  },
  {
    preset: PresetEnum.Standard,
    label: "Standard",
    description: "5 min prep, 25 min coding, 5 min silent, 3 nudges",
  },
  {
    preset: PresetEnum.HighPressure,
    label: "High Pressure",
    description: "3 min prep, 15 min coding, 2 min silent, 1 nudge",
  },
  {
    preset: PresetEnum.NoAssistance,
    label: "No Assistance",
    description: "5 min prep, 25 min coding, 5 min silent, 0 nudges",
  },
];

// ============================================================================
// Component
// ============================================================================

export function HomeScreen(): HTMLElement {
  const state = useStore(AppStore);
  const actions = useActions(AppStore);
  const router = useRouter();

  // Track mic check state for enabling/disabling start button
  const [micCheckState, setMicCheckState] = signal<MicCheckState | null>(null);

  // Preload problems in background while user selects preset
  onMount(() => {
    preloadProblems();
  });

  const handleSelectPreset = (preset: Preset) => {
    actions.selectPreset(preset);
  };

  const handleMicCheckStateChange = (newState: MicCheckState) => {
    setMicCheckState(newState);
    // If mic access was denied, update store so session knows not to record
    if (newState === "denied" || newState === "error") {
      actions.setAudioPermissionDenied(true);
    }
  };

  // Start button should be disabled while mic check is loading
  const isStartDisabled = () => {
    const audioSupported = state.audioSupported();
    const currentMicState = micCheckState();

    // If audio not supported, no mic check needed - can start immediately
    if (!audioSupported) return false;

    // If mic check hasn't completed, disable start
    return currentMicState === null || currentMicState === "loading";
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
    AppHeader(),

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

    // Mic Check + Start Button
    div({ class: "start-section" }, [
      // Show mic check only if audio is supported
      Show(
        () => state.audioSupported(),
        () =>
          MicCheck({
            onStateChange: handleMicCheckStateChange,
          }),
      ),

      Button({
        label: "Start Session",
        variant: "primary",
        size: "large",
        action: "start-session",
        className: "start-button",
        disabled: isStartDisabled,
        onClick: handleStartSession,
      }),
    ]),
  ]);
}
