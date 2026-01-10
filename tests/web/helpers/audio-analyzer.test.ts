import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  createAudioAnalyzer,
  type AudioAnalyzer,
  type AudioAnalyzerState,
} from "../../../web/src/helpers/audio-analyzer";

// ============================================================================
// Mocks
// ============================================================================

interface MockAnalyserNode {
  fftSize: number;
  smoothingTimeConstant: number;
  frequencyBinCount: number;
  getByteFrequencyData: (array: Uint8Array) => void;
  _mockLevel: number;
}

interface MockAudioContext {
  createAnalyser: () => MockAnalyserNode;
  createMediaStreamSource: (stream: MediaStream) => { connect: () => void };
  close: () => Promise<void>;
}

function createMockAudioContext(mockLevel: number = 0.5): MockAudioContext {
  const analyserNode: MockAnalyserNode = {
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 128,
    _mockLevel: mockLevel,
    getByteFrequencyData: (array: Uint8Array) => {
      // Fill with values that produce the desired level
      // Level is calculated as RMS / 128, so we need to reverse that
      const targetRms = analyserNode._mockLevel * 128;
      const value = Math.round(targetRms);
      for (let i = 0; i < array.length; i++) {
        array[i] = value;
      }
    },
  };

  return {
    createAnalyser: () => analyserNode,
    createMediaStreamSource: () => ({ connect: () => {} }),
    close: () => Promise.resolve(),
  };
}

function createMockMediaStream(): MediaStream {
  return {
    getTracks: () => [{ stop: () => {} }],
  } as unknown as MediaStream;
}

// ============================================================================
// Tests
// ============================================================================

describe("createAudioAnalyzer", () => {
  let analyzer: AudioAnalyzer;
  let levels: number[];
  let states: AudioAnalyzerState[];
  let errors: Error[];
  let originalNavigator: typeof navigator.mediaDevices;
  let originalAudioContext: typeof globalThis.AudioContext;
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    levels = [];
    states = [];
    errors = [];
    mockAudioContext = createMockAudioContext(0.5);

    // Store originals
    originalNavigator = navigator.mediaDevices;
    originalAudioContext = globalThis.AudioContext;

    // Mock AudioContext
    globalThis.AudioContext = function () {
      return mockAudioContext;
    } as unknown as typeof AudioContext;
  });

  afterEach(() => {
    analyzer?.stop();

    // Restore originals
    Object.defineProperty(navigator, "mediaDevices", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
    globalThis.AudioContext = originalAudioContext;
  });

  function createTestAnalyzer() {
    return createAudioAnalyzer({
      onLevel: (level) => levels.push(level),
      onStateChange: (state) => states.push(state),
      onError: (error) => errors.push(error),
    });
  }

  describe("initial state", () => {
    it("should start in idle state", () => {
      analyzer = createTestAnalyzer();
      expect(analyzer.getState()).toBe("idle");
    });
  });

  describe("start", () => {
    it("should transition to loading state when starting", async () => {
      // Mock getUserMedia to never resolve (simulates loading)
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => new Promise(() => {}), // Never resolves
        },
        writable: true,
        configurable: true,
      });

      analyzer = createTestAnalyzer();
      analyzer.start(); // Don't await

      expect(states).toContain("loading");
    });

    it("should transition to active state on successful mic access", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.resolve(createMockMediaStream()),
        },
        writable: true,
        configurable: true,
      });

      analyzer = createTestAnalyzer();
      await analyzer.start();

      expect(analyzer.getState()).toBe("active");
      expect(states).toContain("active");
    });

    it("should transition to denied state when permission is denied", async () => {
      const permissionError = new Error("Permission denied");
      permissionError.name = "NotAllowedError";

      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.reject(permissionError),
        },
        writable: true,
        configurable: true,
      });

      analyzer = createTestAnalyzer();
      await analyzer.start();

      expect(analyzer.getState()).toBe("denied");
      expect(states).toContain("denied");
    });

    it("should transition to error state on other errors", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.reject(new Error("Some other error")),
        },
        writable: true,
        configurable: true,
      });

      analyzer = createTestAnalyzer();
      await analyzer.start();

      expect(analyzer.getState()).toBe("error");
      expect(errors.length).toBe(1);
    });

    it("should transition to error state when getUserMedia is not supported", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      analyzer = createTestAnalyzer();
      await analyzer.start();

      expect(analyzer.getState()).toBe("error");
    });

    it("should not restart if already active", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.resolve(createMockMediaStream()),
        },
        writable: true,
        configurable: true,
      });

      analyzer = createTestAnalyzer();
      await analyzer.start();
      const stateCountAfterFirst = states.length;

      await analyzer.start(); // Second call

      // Should not have added more state changes
      expect(states.length).toBe(stateCountAfterFirst);
    });
  });

  describe("stop", () => {
    it("should transition back to idle state", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.resolve(createMockMediaStream()),
        },
        writable: true,
        configurable: true,
      });

      analyzer = createTestAnalyzer();
      await analyzer.start();
      analyzer.stop();

      expect(analyzer.getState()).toBe("idle");
    });

    it("should be safe to call when not started", () => {
      analyzer = createTestAnalyzer();
      expect(() => analyzer.stop()).not.toThrow();
    });
  });

  describe("level detection", () => {
    it("should emit levels when active", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.resolve(createMockMediaStream()),
        },
        writable: true,
        configurable: true,
      });

      analyzer = createAudioAnalyzer(
        {
          onLevel: (level) => levels.push(level),
          onStateChange: (state) => states.push(state),
        },
        { sampleInterval: 10 },
      );

      await analyzer.start();

      // Wait for a few samples
      await new Promise((resolve) => setTimeout(resolve, 50));

      analyzer.stop();

      expect(levels.length).toBeGreaterThan(0);
    });

    it("should emit normalized levels between 0 and 1", async () => {
      Object.defineProperty(navigator, "mediaDevices", {
        value: {
          getUserMedia: () => Promise.resolve(createMockMediaStream()),
        },
        writable: true,
        configurable: true,
      });

      analyzer = createAudioAnalyzer(
        {
          onLevel: (level) => levels.push(level),
          onStateChange: (state) => states.push(state),
        },
        { sampleInterval: 10 },
      );

      await analyzer.start();
      await new Promise((resolve) => setTimeout(resolve, 50));
      analyzer.stop();

      // All levels should be in valid range
      expect(levels.every((l) => l >= 0 && l <= 1)).toBe(true);
    });
  });
});
