import { describe, it, expect, beforeEach } from "bun:test";
import { AppStore, PresetEnum } from "../../web/src/store";

/**
 * AppStore Unit Tests
 *
 * These tests verify the store's state management and action dispatching.
 * Note: Full integration tests with storage/audio are covered by E2E tests.
 */

describe("AppStore", () => {
  beforeEach(() => {
    // Reset to initial state before each test
    const actions = AppStore.getActions();
    actions.resetApp();
  });

  describe("initial state", () => {
    it("should have correct initial screen", () => {
      const state = AppStore.getSnapshot();
      expect(state.screen).toBe("home");
    });

    it("should have null session initially", () => {
      const state = AppStore.getSnapshot();
      expect(state.session).toBe(null);
    });

    it("should have null sessionId initially", () => {
      const state = AppStore.getSnapshot();
      expect(state.sessionId).toBe(null);
    });

    it("should have standard preset selected by default", () => {
      const state = AppStore.getSnapshot();
      expect(state.selectedPreset).toBe(PresetEnum.Standard);
    });

    it("should have zero remaining time initially", () => {
      const state = AppStore.getSnapshot();
      expect(state.remainingMs).toBe(0);
    });

    it("should not be recording initially", () => {
      const state = AppStore.getSnapshot();
      expect(state.isRecording).toBe(false);
    });

    it("should have no incomplete session initially", () => {
      const state = AppStore.getSnapshot();
      expect(state.incompleteSession).toBe(null);
    });

    it("should have idle status initially", () => {
      const state = AppStore.getSnapshot();
      expect(state.status).toBe("idle");
    });
  });

  describe("selectPreset", () => {
    it("should update selectedPreset", () => {
      const actions = AppStore.getActions();
      actions.selectPreset(PresetEnum.HighPressure);

      const state = AppStore.getSnapshot();
      expect(state.selectedPreset).toBe(PresetEnum.HighPressure);
    });

    it("should handle all preset types", () => {
      const actions = AppStore.getActions();

      actions.selectPreset(PresetEnum.Standard);
      expect(AppStore.getSnapshot().selectedPreset).toBe(PresetEnum.Standard);

      actions.selectPreset(PresetEnum.HighPressure);
      expect(AppStore.getSnapshot().selectedPreset).toBe(PresetEnum.HighPressure);

      actions.selectPreset(PresetEnum.NoAssistance);
      expect(AppStore.getSnapshot().selectedPreset).toBe(PresetEnum.NoAssistance);
    });
  });

  describe("resetApp", () => {
    it("should reset to initial state", () => {
      const actions = AppStore.getActions();

      // Change some state
      actions.selectPreset(PresetEnum.HighPressure);

      // Reset
      actions.resetApp();

      const state = AppStore.getSnapshot();
      expect(state.screen).toBe("home");
      expect(state.session).toBe(null);
      expect(state.sessionId).toBe(null);
      // Note: selectedPreset is reset to Standard in resetApp
    });

    it("should preserve audioSupported flag", () => {
      const actions = AppStore.getActions();
      const audioSupported = AppStore.getSnapshot().audioSupported;

      actions.resetApp();

      expect(AppStore.getSnapshot().audioSupported).toBe(audioSupported);
    });
  });
});

/**
 * Integration tests that require storage/audio are tested via E2E.
 * The following would need mocking to unit test properly:
 *
 * - startSession() - requires storage
 * - resumeSession() - requires storage
 * - discardIncompleteSession() - requires storage
 * - abandonSession() - requires storage
 * - startCoding() - requires active session
 * - submitSolution() - requires active session
 * - continuePastSummary() - requires active session
 * - submitReflection() - requires active session
 * - updateInvariants() - requires active session
 * - updateCode() - requires active session
 * - requestNudge() - requires active session
 * - startRecording() - requires audio recorder
 * - stopRecording() - requires audio recorder
 * - exportSession() - requires storage
 */
