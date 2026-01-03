/**
 * RecordingIndicator Component
 *
 * Pulsing red dot to indicate active audio recording.
 */

import { COMPONENTS } from "../constants";

// ============================================================================
// Types
// ============================================================================

export interface RecordingIndicatorProps {
  /** Whether recording is active */
  isRecording: boolean;
  /** Optional label text */
  label?: string;
}

// ============================================================================
// Styles
// ============================================================================

export const styles = `
/* === RecordingIndicator === */
.recording-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.recording-indicator--active {
  color: var(--color-danger);
}

.recording-indicator__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-text-muted);
}

.recording-indicator--active .recording-indicator__dot {
  background-color: var(--color-danger);
  animation: recording-pulse 1.5s ease-in-out infinite;
}

@keyframes recording-pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}
`;

// ============================================================================
// Render
// ============================================================================

export function render(props: RecordingIndicatorProps): string {
  const { isRecording, label = "Recording" } = props;

  const modifierClass = isRecording ? " recording-indicator--active" : "";

  return `
    <span 
      class="recording-indicator${modifierClass}" 
      data-component="${COMPONENTS.RECORDING_INDICATOR}"
    >
      <span class="recording-indicator__dot"></span>
      <span class="recording-indicator__label">${escapeHtml(label)}</span>
    </span>
  `;
}

// ============================================================================
// Update
// ============================================================================

export function update(element: HTMLElement, props: RecordingIndicatorProps): void {
  const { isRecording } = props;

  if (isRecording) {
    element.classList.add("recording-indicator--active");
  } else {
    element.classList.remove("recording-indicator--active");
  }
}

// ============================================================================
// Utilities
// ============================================================================

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
