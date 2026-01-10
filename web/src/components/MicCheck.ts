/**
 * MicCheck Component
 *
 * Pre-session microphone check with audio level visualization.
 * Shows real-time audio levels and provides feedback on mic status.
 */

import { div, span, signal, onMount, onCleanup, Show, watch } from "../framework";
import {
  createAudioAnalyzer,
  type AudioAnalyzer,
  type AudioAnalyzerState,
} from "../helpers/audio-analyzer";

// ============================================================================
// Types
// ============================================================================

export type MicCheckState = "loading" | "active" | "quiet" | "denied" | "error";

export interface MicCheckProps {
  /** Callback when mic check state changes */
  onStateChange?: (state: MicCheckState) => void;
  /** Number of bars to display (default: 10) */
  barCount?: number;
  /** Threshold (0-1) below which audio is considered "quiet" (default: 0.05) */
  quietThreshold?: number;
  /** Time in ms without audio before showing "quiet" warning (default: 2000) */
  quietTimeoutMs?: number;
}

// ============================================================================
// Component
// ============================================================================

export function MicCheck(props: MicCheckProps): HTMLElement {
  const { onStateChange, barCount = 10, quietThreshold = 0.05, quietTimeoutMs = 2000 } = props;

  // Reactive state
  const [state, setState] = signal<MicCheckState>("loading");
  const [level, setLevel] = signal(0);

  // Track if we've detected audio above threshold
  let lastAudioTime = 0;
  let quietCheckInterval: ReturnType<typeof setInterval> | null = null;
  let analyzer: AudioAnalyzer | null = null;

  const updateState = (newState: MicCheckState) => {
    setState(newState);
    onStateChange?.(newState);
  };

  const checkQuietStatus = () => {
    if (state() !== "active" && state() !== "quiet") return;

    const now = Date.now();
    const timeSinceAudio = now - lastAudioTime;

    if (timeSinceAudio > quietTimeoutMs && state() === "active") {
      updateState("quiet");
    } else if (timeSinceAudio <= quietTimeoutMs && state() === "quiet") {
      updateState("active");
    }
  };

  onMount(() => {
    analyzer = createAudioAnalyzer({
      onLevel: (audioLevel) => {
        setLevel(audioLevel);

        // Track when we last heard audio above threshold
        if (audioLevel > quietThreshold) {
          lastAudioTime = Date.now();
          // If we were quiet and now have audio, switch to active
          if (state() === "quiet") {
            updateState("active");
          }
        }
      },
      onStateChange: (analyzerState: AudioAnalyzerState) => {
        if (analyzerState === "active") {
          lastAudioTime = Date.now(); // Start the quiet timer
          updateState("active");
          // Start checking for quiet status
          quietCheckInterval = setInterval(checkQuietStatus, 500);
        } else if (analyzerState === "denied") {
          updateState("denied");
        } else if (analyzerState === "error") {
          updateState("error");
        } else if (analyzerState === "loading") {
          updateState("loading");
        }
      },
      onError: (error) => {
        console.error("MicCheck error:", error);
      },
    });

    // Start analyzing
    analyzer.start();
  });

  onCleanup(() => {
    if (quietCheckInterval) {
      clearInterval(quietCheckInterval);
      quietCheckInterval = null;
    }
    if (analyzer) {
      analyzer.stop();
      analyzer = null;
    }
  });

  // Create the audio level bars
  const createBars = () => {
    const bars: HTMLElement[] = [];
    for (let i = 0; i < barCount; i++) {
      const barIndex = i; // Capture for closure
      const barEl = div({ class: "mic-check__bar" });

      // Set up reactive style updates
      watch(() => {
        const currentLevel = level();
        // Each bar fills based on whether the level exceeds its threshold
        const barThreshold = (barIndex + 1) / barCount;
        const fillPercent =
          currentLevel >= barThreshold ? 100 : (currentLevel * barCount - barIndex) * 100;
        const clampedFill = Math.max(0, Math.min(100, fillPercent));
        barEl.style.height = `${clampedFill}%`;
      });

      bars.push(barEl);
    }
    return bars;
  };

  return div({ class: "mic-check", "data-component": "mic-check" }, [
    // Header
    div({ class: "mic-check__header" }, [
      span({ class: "mic-check__icon" }, ["🎤"]),
      span({ class: "mic-check__title" }, ["Microphone Check"]),
    ]),

    // Content based on state
    Show(
      () => state() === "loading",
      () =>
        div({ class: "mic-check__content mic-check__content--loading" }, [
          span({ class: "mic-check__message" }, ["Requesting microphone access..."]),
        ]),
    ),

    Show(
      () => state() === "active" || state() === "quiet",
      () =>
        // Audio level bars
        div({ class: "mic-check__bars" }, createBars()),
    ),

    Show(
      () => state() === "active" || state() === "quiet",
      () =>
        div({ class: "mic-check__content" }, [
          // Status message
          Show(
            () => state() === "active",
            () =>
              div({ class: "mic-check__status mic-check__status--success" }, [
                span({ class: "mic-check__status-icon" }, ["✓"]),
                span({}, ["Microphone working"]),
              ]),
            () =>
              div({ class: "mic-check__status mic-check__status--warning" }, [
                span({ class: "mic-check__status-icon" }, ["⚠"]),
                span({}, ["No audio detected"]),
              ]),
          ),
        ]),
    ),

    Show(
      () => state() === "denied",
      () =>
        div({ class: "mic-check__content mic-check__content--error" }, [
          div({ class: "mic-check__status mic-check__status--error" }, [
            span({ class: "mic-check__status-icon" }, ["✗"]),
            span({}, ["Microphone access blocked"]),
          ]),
          span({ class: "mic-check__hint" }, ["Session will continue without audio recording"]),
        ]),
    ),

    Show(
      () => state() === "error",
      () =>
        div({ class: "mic-check__content mic-check__content--error" }, [
          div({ class: "mic-check__status mic-check__status--error" }, [
            span({ class: "mic-check__status-icon" }, ["✗"]),
            span({}, ["Microphone error"]),
          ]),
          span({ class: "mic-check__hint" }, ["Session will continue without audio recording"]),
        ]),
    ),
  ]);
}
