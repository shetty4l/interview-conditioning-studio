/**
 * Application Store
 *
 * Central state management using the reactive framework store.
 * Coordinates between core session engine, timer, storage, and audio.
 */

import { createStore } from "./framework";
import { createSession, type Session, type Preset, Preset as PresetEnum, Phase } from "../../core/src/index";
import { createTimer, type Timer } from "./helpers/timer";
import { createStorage, type Storage } from "./storage";
import { createAudioRecorder, isAudioSupported, type AudioRecorder } from "./audio";
import { getRandomProblem, type Problem } from "./problems";
import { exportSession } from "./export";
import type { ScreenName, StoredSession, ReflectionFormData } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface AppStoreState {
  // Screen
  screen: ScreenName;

  // Session
  session: Session | null;
  sessionId: string | null;
  problem: Problem | null;
  selectedPreset: Preset;

  // Timer
  remainingMs: number;

  // Audio
  audioSupported: boolean;
  audioPermissionDenied: boolean;
  isRecording: boolean;

  // Resume
  incompleteSession: {
    id: string;
    problemTitle: string;
    phase: string;
  } | null;

  // Computed from session (cached for reactivity)
  phase: Phase | null;
  invariants: string;
  code: string;
  nudgesUsed: number;
  nudgesAllowed: number;
  status: "idle" | "in_progress" | "completed" | "abandoned_explicit";

  // Config (from session)
  prepDurationMs: number;
  codingDurationMs: number;
  silentDurationMs: number;
}

export interface AppStoreActions {
  // Initialization
  init(): Promise<void>;

  // Session lifecycle
  selectPreset(preset: Preset): void;
  startSession(): Promise<void>;
  resumeSession(): Promise<void>;
  discardIncompleteSession(): Promise<void>;
  abandonSession(): Promise<void>;
  resetApp(): void;

  // Phase transitions
  startCoding(): Promise<void>;
  submitSolution(): Promise<void>;
  continuePastSummary(): Promise<void>;
  submitReflection(responses: ReflectionFormData): Promise<void>;

  // Content updates
  updateInvariants(text: string): Promise<void>;
  updateCode(text: string): Promise<void>;
  requestNudge(): Promise<void>;

  // Audio
  startRecording(): Promise<void>;
  stopRecording(): Promise<void>;

  // Export
  exportSession(): Promise<void>;

  // Internal
  _syncSessionState(): Promise<void>;
  _handlePhaseExpiry(): void;
  _checkIncompleteSession(): Promise<void>;
  _loadSession(sessionId: string): Promise<boolean>;
}

// ============================================================================
// Helpers (module-scoped, not OOP)
// ============================================================================

let timer: Timer | null = null;
let storage: Storage | null = null;
let audioRecorder: AudioRecorder | null = null;

// ============================================================================
// Initial State
// ============================================================================

const initialState: AppStoreState = {
  screen: "home",
  session: null,
  sessionId: null,
  problem: null,
  selectedPreset: PresetEnum.Standard,
  remainingMs: 0,
  audioSupported: false,
  audioPermissionDenied: false,
  isRecording: false,
  incompleteSession: null,
  phase: null,
  invariants: "",
  code: "",
  nudgesUsed: 0,
  nudgesAllowed: 0,
  status: "idle",
  prepDurationMs: 0,
  codingDurationMs: 0,
  silentDurationMs: 0,
};

// ============================================================================
// Store
// ============================================================================

export const AppStore = createStore<AppStoreState, AppStoreActions>({
  state: initialState,
  actions: (set, get) => {
    // ========================================================================
    // Helper: Phase to Screen mapping
    // ========================================================================
    const phaseToScreen = (phase: Phase | null | undefined): ScreenName => {
      switch (phase) {
        case Phase.Prep:
          return "prep";
        case Phase.Coding:
          return "coding";
        case Phase.Silent:
          return "silent";
        case Phase.Summary:
          return "summary";
        case Phase.Reflection:
          return "reflection";
        case Phase.Done:
          return "done";
        default:
          return "home";
      }
    };

    // ========================================================================
    // Helper: Get remaining time for current phase
    // ========================================================================
    const calculateRemainingMs = (): number => {
      const { session } = get();
      if (!session) return 0;

      const state = session.getState();
      const now = Date.now();

      switch (state.phase) {
        case Phase.Prep: {
          const endTime = (state.sessionStartedAt ?? now) + state.config.prepDuration;
          return Math.max(0, endTime - now);
        }
        case Phase.Coding: {
          const endTime = (state.codingStartedAt ?? now) + state.config.codingDuration;
          return Math.max(0, endTime - now);
        }
        case Phase.Silent: {
          const endTime = (state.silentStartedAt ?? now) + state.config.silentDuration;
          return Math.max(0, endTime - now);
        }
        default:
          return 0;
      }
    };

    // ========================================================================
    // Helper: Sync session state to store
    // ========================================================================
    const syncSessionState = async (): Promise<void> => {
      const { session, problem } = get();
      if (!session) return;

      const sessionState = session.getState();
      const screen = phaseToScreen(sessionState.phase);
      const remainingMs = calculateRemainingMs();

      set({
        screen,
        sessionId: sessionState.id ?? null,
        phase: sessionState.phase ?? null,
        invariants: sessionState.invariants,
        code: sessionState.code,
        nudgesUsed: sessionState.nudgesUsed,
        nudgesAllowed: sessionState.config.nudgeBudget,
        status: sessionState.status,
        remainingMs,
        prepDurationMs: sessionState.config.prepDuration,
        codingDurationMs: sessionState.config.codingDuration,
        silentDurationMs: sessionState.config.silentDuration,
      });

      // Persist to storage
      if (storage && sessionState.id && problem) {
        try {
          const storedSession: StoredSession = {
            id: sessionState.id,
            events: session.getEvents(),
            problem,
            preset: sessionState.preset,
            createdAt: sessionState.sessionStartedAt ?? Date.now(),
            updatedAt: Date.now(),
          };
          await storage.saveSession(storedSession);
        } catch (error) {
          console.error("Failed to persist session:", error);
        }
      }
    };

    // ========================================================================
    // Helper: Handle phase expiry (timer ran out)
    // ========================================================================
    const handlePhaseExpiry = (): void => {
      const { session, phase } = get();
      if (!session) return;

      switch (phase) {
        case Phase.Prep:
          // Auto-start coding when prep timer expires
          session.dispatch("coding.started");
          break;
        case Phase.Coding:
          // Auto-start silent phase when coding timer expires
          session.dispatch("coding.silent_started");
          break;
        case Phase.Silent:
          // Auto-end silent phase when timer expires
          session.dispatch("silent.ended");
          break;
      }

      syncSessionState();
    };

    // ========================================================================
    // Helper: Start timer for current phase
    // ========================================================================
    const startPhaseTimer = (): void => {
      if (!timer) {
        timer = createTimer({
          onTick: (remainingMs) => {
            set({ remainingMs });
          },
          onExpire: handlePhaseExpiry,
        });
      }

      const remainingMs = calculateRemainingMs();
      if (remainingMs > 0) {
        timer.start(remainingMs);
      }
    };

    // ========================================================================
    // Helper: Stop timer
    // ========================================================================
    const stopTimer = (): void => {
      timer?.stop();
    };

    // ========================================================================
    // Actions
    // ========================================================================

    return {
      // ----------------------------------------------------------------------
      // Initialization
      // ----------------------------------------------------------------------
      async init() {
        // Initialize storage
        storage = createStorage();
        await storage.init();

        // Check audio support
        set({ audioSupported: isAudioSupported() });

        // Check for incomplete session
        await this._checkIncompleteSession();
      },

      // ----------------------------------------------------------------------
      // Session lifecycle
      // ----------------------------------------------------------------------
      selectPreset(preset: Preset) {
        set({ selectedPreset: preset });
      },

      async startSession() {
        const { selectedPreset } = get();
        const problem = getRandomProblem();

        const session = createSession({
          preset: selectedPreset,
          problem: {
            id: problem.id,
            title: problem.title,
            description: problem.description,
          },
        });

        // Subscribe to session events
        session.subscribe((event, state) => {
          console.log("Session event:", event.type, state.phase);
          syncSessionState();

          // Stop timer when session is done
          if (state.status === "completed" || state.status === "abandoned_explicit") {
            stopTimer();
          }
        });

        // Start the session
        const result = session.dispatch("session.started");
        if (!result.ok) {
          console.error("Failed to start session:", result.error);
          return;
        }

        const sessionState = session.getState();

        set({
          session,
          problem,
          sessionId: sessionState.id ?? null,
          screen: "prep",
          phase: Phase.Prep,
          invariants: "",
          code: "",
          nudgesUsed: 0,
          nudgesAllowed: sessionState.config.nudgeBudget,
          status: "in_progress",
          prepDurationMs: sessionState.config.prepDuration,
          codingDurationMs: sessionState.config.codingDuration,
          silentDurationMs: sessionState.config.silentDuration,
          incompleteSession: null,
        });

        await syncSessionState();
        startPhaseTimer();
      },

      async resumeSession() {
        const { incompleteSession } = get();
        if (!incompleteSession) return;

        const loaded = await this._loadSession(incompleteSession.id);
        if (loaded) {
          set({ incompleteSession: null });
        }
      },

      async discardIncompleteSession() {
        const { incompleteSession } = get();
        if (!incompleteSession || !storage) return;

        try {
          await storage.deleteSession(incompleteSession.id);
          set({ incompleteSession: null });
        } catch (error) {
          console.error("Failed to discard session:", error);
        }
      },

      async abandonSession() {
        const { session, sessionId } = get();
        if (!session) return;

        session.dispatch("session.abandoned");
        stopTimer();

        // Delete from storage
        if (sessionId && storage) {
          try {
            await storage.deleteSession(sessionId);
          } catch (error) {
            console.error("Failed to delete session:", error);
          }
        }

        this.resetApp();
      },

      resetApp() {
        stopTimer();
        this.stopRecording();

        const { audioSupported } = get();

        set({
          ...initialState,
          audioSupported,
        });

        // Check for incomplete sessions after reset
        this._checkIncompleteSession();
      },

      // ----------------------------------------------------------------------
      // Phase transitions
      // ----------------------------------------------------------------------
      async startCoding() {
        const { session } = get();
        if (!session) return;

        const result = session.dispatch("coding.started");
        if (!result.ok) {
          console.error("Failed to start coding:", result.error);
          return;
        }

        await syncSessionState();
        startPhaseTimer();
      },

      async submitSolution() {
        const { session } = get();
        if (!session) return;

        const result = session.dispatch("coding.solution_submitted");
        if (!result.ok) {
          console.error("Failed to submit solution:", result.error);
          return;
        }

        stopTimer();
        await syncSessionState();
      },

      async continuePastSummary() {
        const { session } = get();
        if (!session) return;

        const result = session.dispatch("summary.continued");
        if (!result.ok) {
          console.error("Failed to continue past summary:", result.error);
          return;
        }

        await syncSessionState();
      },

      async submitReflection(responses: ReflectionFormData) {
        const { session } = get();
        if (!session) return;

        const result = session.dispatch("reflection.submitted", { responses });
        if (!result.ok) {
          console.error("Failed to submit reflection:", result.error);
          return;
        }

        await syncSessionState();
      },

      // ----------------------------------------------------------------------
      // Content updates
      // ----------------------------------------------------------------------
      async updateInvariants(text: string) {
        const { session } = get();
        if (!session) return;

        session.dispatch("prep.invariants_changed", { invariants: text });
        set({ invariants: text });
        await syncSessionState();
      },

      async updateCode(text: string) {
        const { session } = get();
        if (!session) return;

        session.dispatch("coding.code_changed", { code: text });
        set({ code: text });
        await syncSessionState();
      },

      async requestNudge() {
        const { session } = get();
        if (!session) return;

        const result = session.dispatch("nudge.requested");
        if (!result.ok) {
          console.error("Nudge request failed:", result.error);
        }
        await syncSessionState();
      },

      // ----------------------------------------------------------------------
      // Audio
      // ----------------------------------------------------------------------
      async startRecording() {
        const { sessionId, isRecording } = get();
        if (!sessionId || isRecording) return;

        // Create recorder if needed
        if (!audioRecorder) {
          audioRecorder = createAudioRecorder(sessionId, (state) => {
            set({
              isRecording: state.isRecording,
              audioPermissionDenied: state.permissionDenied,
            });
          });
        }

        try {
          await audioRecorder.start();
        } catch (error) {
          console.error("Failed to start recording:", error);
        }
      },

      async stopRecording() {
        if (!audioRecorder) return;

        try {
          await audioRecorder.stop();
        } catch (error) {
          console.error("Failed to stop recording:", error);
        }

        set({ isRecording: false });
      },

      // ----------------------------------------------------------------------
      // Export
      // ----------------------------------------------------------------------
      async exportSession() {
        const { sessionId } = get();
        if (!sessionId || !storage) return;

        try {
          const stored = await storage.getSession(sessionId);
          if (!stored) {
            console.error("Session not found for export");
            return;
          }

          await exportSession(stored);
        } catch (error) {
          console.error("Failed to export session:", error);
        }
      },

      // ----------------------------------------------------------------------
      // Internal helpers
      // ----------------------------------------------------------------------
      async _syncSessionState() {
        await syncSessionState();
      },

      _handlePhaseExpiry() {
        handlePhaseExpiry();
      },

      async _checkIncompleteSession() {
        if (!storage) return;

        try {
          const incomplete = await storage.getIncompleteSession();
          const { sessionId } = get();

          if (incomplete && incomplete.id !== sessionId) {
            // Get the phase from events
            const lastEvent = incomplete.events[incomplete.events.length - 1];
            const phaseMap: Record<string, string> = {
              "session.started": "Prep",
              "coding.started": "Coding",
              "coding.silent_started": "Silent",
              "silent.ended": "Summary",
              "summary.continued": "Reflection",
            };
            const phase = phaseMap[lastEvent?.type] || "Unknown";

            set({
              incompleteSession: {
                id: incomplete.id,
                problemTitle: incomplete.problem.title,
                phase,
              },
            });
          } else {
            set({ incompleteSession: null });
          }
        } catch (error) {
          console.error("Failed to check for incomplete session:", error);
        }
      },

      async _loadSession(sessionId: string): Promise<boolean> {
        if (!storage) return false;

        try {
          const stored = await storage.getSession(sessionId);
          if (!stored) return false;

          // Recreate session from stored events
          const session = createSession({
            preset: stored.preset,
            problem: stored.problem,
          });

          // Restore events
          session.restore(stored.events);

          // Subscribe to future events
          session.subscribe((event, state) => {
            console.log("Session event:", event.type, state.phase);
            syncSessionState();
          });

          const sessionState = session.getState();

          set({
            session,
            problem: stored.problem,
            sessionId: stored.id,
            screen: phaseToScreen(sessionState.phase),
            phase: sessionState.phase ?? null,
            invariants: sessionState.invariants,
            code: sessionState.code,
            nudgesUsed: sessionState.nudgesUsed,
            nudgesAllowed: sessionState.config.nudgeBudget,
            status: sessionState.status,
            prepDurationMs: sessionState.config.prepDuration,
            codingDurationMs: sessionState.config.codingDuration,
            silentDurationMs: sessionState.config.silentDuration,
          });

          startPhaseTimer();
          return true;
        } catch (error) {
          console.error("Failed to load session:", error);
          return false;
        }
      },
    };
  },
});

// ============================================================================
// Exports for convenience
// ============================================================================

export type { Preset, Phase } from "../../core/src/index";
export { Preset as PresetEnum, Phase as PhaseEnum } from "../../core/src/index";
