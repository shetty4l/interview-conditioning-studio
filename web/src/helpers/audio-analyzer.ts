/**
 * Audio Analyzer helper - real-time microphone level detection
 *
 * Factory function that creates an audio analyzer for mic check visualization.
 * Uses Web Audio API to get real-time audio levels from the microphone.
 * Provides callbacks for level updates and errors.
 */

// ============================================================================
// Types
// ============================================================================

export type AudioAnalyzerState = "idle" | "loading" | "active" | "denied" | "error";

export interface AudioAnalyzerCallbacks {
  /** Called with normalized audio level (0-1) at regular intervals */
  onLevel: (level: number) => void;
  /** Called when state changes */
  onStateChange: (state: AudioAnalyzerState) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

export interface AudioAnalyzer {
  /** Start requesting microphone access and analyzing audio */
  start(): Promise<void>;
  /** Stop analyzing and release microphone */
  stop(): void;
  /** Get current state */
  getState(): AudioAnalyzerState;
}

export interface AudioAnalyzerOptions {
  /** How often to sample audio level in ms (default: 50) */
  sampleInterval?: number;
  /** FFT size for frequency analysis (default: 256) */
  fftSize?: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createAudioAnalyzer(
  callbacks: AudioAnalyzerCallbacks,
  options: AudioAnalyzerOptions = {},
): AudioAnalyzer {
  const { sampleInterval = 50, fftSize = 256 } = options;

  let state: AudioAnalyzerState = "idle";
  let audioContext: AudioContext | null = null;
  let analyserNode: AnalyserNode | null = null;
  let mediaStream: MediaStream | null = null;
  let animationFrameId: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const setState = (newState: AudioAnalyzerState) => {
    state = newState;
    callbacks.onStateChange(state);
  };

  const getLevel = (): number => {
    if (!analyserNode) return 0;

    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    analyserNode.getByteFrequencyData(dataArray);

    // Calculate RMS (root mean square) for better level representation
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / dataArray.length);

    // Normalize to 0-1 range (255 is max value for Uint8Array)
    return Math.min(1, rms / 128);
  };

  const startLevelPolling = () => {
    // Use setInterval for consistent timing
    intervalId = setInterval(() => {
      const level = getLevel();
      callbacks.onLevel(level);
    }, sampleInterval);
  };

  const stopLevelPolling = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const start = async (): Promise<void> => {
    if (state === "active" || state === "loading") return;

    setState("loading");

    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia not supported");
      }

      // Request microphone access
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Create audio context and analyzer
      audioContext = new AudioContext();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = fftSize;
      analyserNode.smoothingTimeConstant = 0.8;

      // Connect microphone to analyzer
      const source = audioContext.createMediaStreamSource(mediaStream);
      source.connect(analyserNode);

      // Start polling for levels
      startLevelPolling();

      setState("active");
    } catch (error) {
      // Handle permission denied specifically
      if (error instanceof Error) {
        if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
          setState("denied");
        } else {
          setState("error");
          callbacks.onError?.(error);
        }
      } else {
        setState("error");
        callbacks.onError?.(new Error("Unknown error"));
      }
    }
  };

  const stop = () => {
    stopLevelPolling();

    // Stop all tracks in the media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    // Close audio context
    if (audioContext) {
      audioContext.close().catch(() => {
        // Ignore errors when closing
      });
      audioContext = null;
    }

    analyserNode = null;
    setState("idle");
  };

  const getState = () => state;

  return {
    start,
    stop,
    getState,
  };
}
