/**
 * IDS API for E2E Testing
 *
 * Exposes window.IDS for Playwright tests to interact with app state,
 * trigger actions, and access storage.
 *
 * This API is intentionally separate from the main app code to keep
 * test infrastructure isolated.
 */

import { AppStore } from "./store";
import { createStorage } from "./storage";
import type { ReflectionFormData } from "./types";

// ============================================================================
// Storage Singleton with Lazy Init
// ============================================================================

const storage = createStorage();
let storageReady = false;

async function ensureStorage(): Promise<void> {
  if (!storageReady) {
    await storage.init();
    storageReady = true;
  }
}

// ============================================================================
// Types
// ============================================================================

export interface IDSAPI {
  // State access
  getAppState: () => ReturnType<typeof AppStore.getSnapshot> & {
    sessionState: ReturnType<
      NonNullable<ReturnType<typeof AppStore.getSnapshot>["session"]>["getState"]
    > | null;
  };

  // Session lifecycle
  startSession: () => Promise<void>;
  abandonSession: () => Promise<void>;
  resetApp: () => void;

  // Content updates
  updateInvariants: (text: string) => Promise<void>;
  startCoding: () => Promise<void>;
  updateCode: (text: string) => Promise<void>;
  requestNudge: () => Promise<void>;
  submitSolution: () => Promise<void>;
  continuePastSummary: () => Promise<void>;
  submitReflection: (responses: ReflectionFormData) => Promise<void>;

  // Storage access
  storage: {
    clearAll: () => Promise<void>;
    getStats: () => Promise<{ sessionCount: number; audioCount: number }>;
    getSession: (id: string) => Promise<unknown>;
    getIncompleteSession: () => Promise<unknown>;
    getAllSessions: () => Promise<unknown[]>;
    softDeleteSession: (id: string) => Promise<void>;
  };

  // Router helpers (simplified)
  router: {
    getPath: () => string;
    navigate: (path: string) => void;
  };
}

// ============================================================================
// Global Declaration
// ============================================================================

declare global {
  interface Window {
    IDS: IDSAPI;
  }
}

// ============================================================================
// Setup Function
// ============================================================================

export function setupIDSAPI(): void {
  const actions = AppStore.getActions();

  window.IDS = {
    // State access
    getAppState: () => {
      const snapshot = AppStore.getSnapshot();
      return {
        ...snapshot,
        sessionState: snapshot.session?.getState() ?? null,
      };
    },

    // Session lifecycle
    startSession: () => actions.startSession(),
    abandonSession: () => actions.abandonSession(),
    resetApp: () => actions.resetApp(),

    // Content updates
    updateInvariants: (text) => actions.updateInvariants(text),
    startCoding: () => actions.startCoding(),
    updateCode: (text) => actions.updateCode(text),
    requestNudge: () => actions.requestNudge(),
    submitSolution: () => actions.submitSolution(),
    continuePastSummary: () => actions.continuePastSummary(),
    submitReflection: (responses) => actions.submitReflection(responses),

    // Storage (with lazy init)
    storage: {
      clearAll: async () => {
        await ensureStorage();
        await storage.clearAll();
      },
      getStats: async () => {
        await ensureStorage();
        return storage.getStats();
      },
      getSession: async (id) => {
        await ensureStorage();
        return storage.getSession(id);
      },
      getIncompleteSession: async () => {
        await ensureStorage();
        return storage.getIncompleteSession();
      },
      getAllSessions: async () => {
        await ensureStorage();
        return storage.getAllSessions();
      },
      softDeleteSession: async (id) => {
        await ensureStorage();
        await storage.softDeleteSession(id);
      },
    },

    // Router (simplified - just path access and navigation)
    router: {
      getPath: () => window.location.hash.slice(1) || "/",
      navigate: (path) => {
        window.location.hash = "#" + path;
      },
    },
  };
}
