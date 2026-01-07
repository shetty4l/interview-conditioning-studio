/**
 * Audio Recording Module
 *
 * MediaRecorder wrapper with permission handling and IndexedDB persistence.
 * Supports cross-browser audio format detection (webm/opus for Chrome/Firefox, mp4 for Safari).
 */

import { saveAudioChunk } from "./storage";

// ============================================================================
// Types
// ============================================================================

export interface AudioState {
  /** Whether recording is currently active */
  isRecording: boolean;
  /** Whether microphone permission was denied */
  permissionDenied: boolean;
  /** Whether audio recording is supported in this browser */
  isSupported: boolean;
  /** The detected MIME type for recording */
  mimeType: string | null;
}

export interface AudioRecorder {
  /** Start recording audio */
  start: () => Promise<void>;
  /** Stop recording and save to storage */
  stop: () => Promise<void>;
  /** Get current recording state */
  getState: () => AudioState;
  /** Cleanup resources */
  destroy: () => void;
}

type AudioStateChangeHandler = (state: AudioState) => void;

// ============================================================================
// MIME Type Detection
// ============================================================================

/**
 * Detect the best supported audio MIME type.
 * Prefers webm/opus (smaller files) but falls back to mp4 for Safari.
 */
export function detectMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }

  // Preferred: webm with opus codec (Chrome, Firefox)
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
    return "audio/webm;codecs=opus";
  }

  // Fallback: webm without codec specification
  if (MediaRecorder.isTypeSupported("audio/webm")) {
    return "audio/webm";
  }

  // Safari fallback: mp4
  if (MediaRecorder.isTypeSupported("audio/mp4")) {
    return "audio/mp4";
  }

  // Last resort: let browser decide
  return "audio/webm";
}

/**
 * Get file extension for a MIME type.
 */
export function getFileExtension(mimeType: string): string {
  if (mimeType.startsWith("audio/webm")) {
    return "webm";
  }
  if (mimeType.startsWith("audio/mp4")) {
    return "m4a";
  }
  return "audio";
}

/**
 * Check if audio recording is supported.
 */
export function isAudioSupported(): boolean {
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getUserMedia !== "undefined"
  );
}

// ============================================================================
// Audio Recorder Factory
// ============================================================================

/**
 * Create an audio recorder for a session.
 */
export function createAudioRecorder(
  sessionId: string,
  onStateChange?: AudioStateChangeHandler,
): AudioRecorder {
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;

  const mimeType = detectMimeType();

  const state: AudioState = {
    isRecording: false,
    permissionDenied: false,
    isSupported: isAudioSupported() && mimeType !== null,
    mimeType,
  };

  const notifyStateChange = () => {
    onStateChange?.({ ...state });
  };

  /**
   * Request microphone permission and start recording.
   */
  const start = async (): Promise<void> => {
    if (!state.isSupported || !mimeType) {
      console.warn("Audio recording not supported");
      return;
    }

    if (state.isRecording) {
      console.warn("Already recording");
      return;
    }

    try {
      // Request microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create MediaRecorder
      mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      // Handle data chunks
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          try {
            await saveAudioChunk(sessionId, event.data, mimeType);
          } catch (error) {
            console.error("Failed to save audio chunk:", error);
          }
        }
      };

      // Handle recording stop
      // Guard: only notify if state actually changed to prevent feedback loops
      mediaRecorder.onstop = () => {
        if (state.isRecording) {
          state.isRecording = false;
          notifyStateChange();
        }
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        state.isRecording = false;
        notifyStateChange();
      };

      // Start recording with 1-second chunks for incremental saving
      mediaRecorder.start(1000);

      state.isRecording = true;
      state.permissionDenied = false;
      notifyStateChange();
    } catch (error) {
      console.error("Failed to start recording:", error);

      // Check if permission was denied
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          state.permissionDenied = true;
          notifyStateChange();
        }
      }

      throw error;
    }
  };

  /**
   * Stop recording and finalize audio data.
   */
  const stop = async (): Promise<void> => {
    if (!mediaRecorder || !state.isRecording) {
      return;
    }

    return new Promise((resolve) => {
      if (!mediaRecorder) {
        resolve();
        return;
      }

      // Wait for the final data to be saved
      const originalOnStop = mediaRecorder.onstop;
      const recorder = mediaRecorder;
      mediaRecorder.onstop = (event) => {
        if (originalOnStop) {
          originalOnStop.call(recorder, event);
        }

        // Stop all tracks in the media stream
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;
        }

        resolve();
      };

      mediaRecorder.stop();
    });
  };

  /**
   * Get current state.
   */
  const getState = (): AudioState => ({ ...state });

  /**
   * Cleanup all resources.
   */
  const destroy = (): void => {
    if (mediaRecorder && state.isRecording) {
      mediaRecorder.stop();
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    mediaRecorder = null;
  };

  return {
    start,
    stop,
    getState,
    destroy,
  };
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if microphone permission has been granted.
 * Returns 'granted', 'denied', or 'prompt'.
 */
export async function checkMicrophonePermission(): Promise<PermissionState> {
  if (!navigator.permissions) {
    // Fallback: assume we need to prompt
    return "prompt";
  }

  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result.state;
  } catch {
    // Firefox doesn't support microphone permission query
    return "prompt";
  }
}
