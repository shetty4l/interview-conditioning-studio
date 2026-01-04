/**
 * RecordingIndicator Component
 *
 * Shows recording status.
 */

import { span } from "../framework";

// ============================================================================
// Types
// ============================================================================

export interface RecordingIndicatorProps {
  isRecording: boolean | (() => boolean);
}

// ============================================================================
// Component
// ============================================================================

export function RecordingIndicator(props: RecordingIndicatorProps): HTMLElement {
  const { isRecording } = props;

  const getIsRecording = typeof isRecording === "function" ? isRecording : () => isRecording;

  return span(
    {
      class: () =>
        getIsRecording()
          ? "recording-indicator"
          : "recording-indicator recording-indicator--inactive",
    },
    [() => (getIsRecording() ? "REC" : "NOT RECORDING")],
  );
}
