/**
 * IndexedDB Storage
 *
 * Persistent storage for sessions and audio using IndexedDB.
 * Provides async API for save/load operations.
 *
 * Uses factory pattern with internal singleton for consistency with other modules.
 */

import type { StoredSession, StoredAudio } from "./types";

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = "interview-conditioning-studio";
const DB_VERSION = 1;

const STORES = {
  SESSIONS: "sessions",
  AUDIO: "audio",
} as const;

// ============================================================================
// Types
// ============================================================================

export interface Storage {
  /** Initialize the database connection. Must be called before other operations. */
  init(): Promise<void>;
  /** Check if storage is initialized */
  isInitialized(): boolean;

  // Session operations
  saveSession(session: StoredSession): Promise<void>;
  getSession(id: string): Promise<StoredSession | null>;
  getAllSessions(): Promise<StoredSession[]>;
  getIncompleteSession(): Promise<StoredSession | null>;
  deleteSession(id: string): Promise<void>;
  clearAll(): Promise<void>;

  // Audio operations
  saveAudioChunk(sessionId: string, chunk: Blob, mimeType: string): Promise<void>;
  getAudioBlob(sessionId: string): Promise<Blob | null>;
  getAudioMimeType(sessionId: string): Promise<string | null>;
  deleteAudio(sessionId: string): Promise<void>;

  // Utility
  getStats(): Promise<{ sessionCount: number; audioCount: number }>;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: Storage | null = null;
let db: IDBDatabase | null = null;

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a storage instance.
 * Returns singleton - multiple calls return the same instance.
 */
export function createStorage(): Storage {
  if (instance) {
    return instance;
  }

  // ============================================================================
  // Database Connection
  // ============================================================================

  const init = async (): Promise<void> => {
    if (db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("Failed to open database:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;

        // Create sessions store
        if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionStore = database.createObjectStore(STORES.SESSIONS, {
            keyPath: "id",
          });
          sessionStore.createIndex("createdAt", "createdAt", { unique: false });
          sessionStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }

        // Create audio store
        if (!database.objectStoreNames.contains(STORES.AUDIO)) {
          database.createObjectStore(STORES.AUDIO, {
            keyPath: "sessionId",
          });
        }
      };
    });
  };

  const isInitialized = (): boolean => {
    return db !== null;
  };

  const getDb = (): IDBDatabase => {
    if (!db) {
      throw new Error("Storage not initialized. Call init() first.");
    }
    return db;
  };

  // ============================================================================
  // Session Operations
  // ============================================================================

  const saveSession = async (session: StoredSession): Promise<void> => {
    const database = getDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.SESSIONS, "readwrite");
      const store = transaction.objectStore(STORES.SESSIONS);

      const request = store.put({
        ...session,
        updatedAt: Date.now(),
      });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  const getSession = async (id: string): Promise<StoredSession | null> => {
    const database = getDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.SESSIONS, "readonly");
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  };

  const getAllSessions = async (): Promise<StoredSession[]> => {
    const database = getDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.SESSIONS, "readonly");
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sessions = request.result as StoredSession[];
        // Sort by updatedAt descending (most recent first)
        sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(sessions);
      };
    });
  };

  const getIncompleteSession = async (): Promise<StoredSession | null> => {
    const sessions = await getAllSessions();

    // Find first session that's not completed or abandoned
    for (const session of sessions) {
      const lastEvent = session.events[session.events.length - 1];
      if (lastEvent) {
        const status = lastEvent.type;
        // Session is incomplete if it hasn't reached session.completed or session.abandoned
        if (status !== "session.completed" && status !== "session.abandoned") {
          return session;
        }
      }
    }

    return null;
  };

  const deleteSession = async (id: string): Promise<void> => {
    const database = getDb();

    // Delete session
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORES.SESSIONS, "readwrite");
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });

    // Delete associated audio
    await deleteAudio(id);
  };

  const clearAll = async (): Promise<void> => {
    const database = getDb();

    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([STORES.SESSIONS, STORES.AUDIO], "readwrite");

      transaction.objectStore(STORES.SESSIONS).clear();
      transaction.objectStore(STORES.AUDIO).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  };

  // ============================================================================
  // Audio Operations
  // ============================================================================

  const getAudioData = async (sessionId: string): Promise<StoredAudio | null> => {
    const database = getDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.AUDIO, "readonly");
      const store = transaction.objectStore(STORES.AUDIO);
      const request = store.get(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  };

  const saveAudioChunk = async (
    sessionId: string,
    chunk: Blob,
    mimeType: string,
  ): Promise<void> => {
    const database = getDb();

    // Get existing audio data
    const existing = await getAudioData(sessionId);

    const audioData: StoredAudio = {
      sessionId,
      chunks: existing ? [...existing.chunks, chunk] : [chunk],
      mimeType,
    };

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.AUDIO, "readwrite");
      const store = transaction.objectStore(STORES.AUDIO);
      const request = store.put(audioData);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  const getAudioBlob = async (sessionId: string): Promise<Blob | null> => {
    const audioData = await getAudioData(sessionId);

    if (!audioData || audioData.chunks.length === 0) {
      return null;
    }

    return new Blob(audioData.chunks, { type: audioData.mimeType });
  };

  const getAudioMimeType = async (sessionId: string): Promise<string | null> => {
    const audioData = await getAudioData(sessionId);
    return audioData?.mimeType ?? null;
  };

  const deleteAudio = async (sessionId: string): Promise<void> => {
    const database = getDb();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORES.AUDIO, "readwrite");
      const store = transaction.objectStore(STORES.AUDIO);
      const request = store.delete(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  };

  // ============================================================================
  // Utility
  // ============================================================================

  const getStats = async (): Promise<{
    sessionCount: number;
    audioCount: number;
  }> => {
    const database = getDb();

    const sessionCount = await new Promise<number>((resolve, reject) => {
      const transaction = database.transaction(STORES.SESSIONS, "readonly");
      const store = transaction.objectStore(STORES.SESSIONS);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    const audioCount = await new Promise<number>((resolve, reject) => {
      const transaction = database.transaction(STORES.AUDIO, "readonly");
      const store = transaction.objectStore(STORES.AUDIO);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    return { sessionCount, audioCount };
  };

  // Create and cache instance
  instance = {
    init,
    isInitialized,
    saveSession,
    getSession,
    getAllSessions,
    getIncompleteSession,
    deleteSession,
    clearAll,
    saveAudioChunk,
    getAudioBlob,
    getAudioMimeType,
    deleteAudio,
    getStats,
  };

  return instance;
}

// ============================================================================
// Legacy Exports (for backward compatibility during migration)
// ============================================================================

// These re-export the singleton methods for existing code that uses the old API.
// They will be removed after migration is complete.

const _storage = createStorage();

export const initStorage = () => _storage.init();
export const isStorageInitialized = () => _storage.isInitialized();
export const saveSession = (session: StoredSession) => _storage.saveSession(session);
export const getSession = (id: string) => _storage.getSession(id);
export const getAllSessions = () => _storage.getAllSessions();
export const getIncompleteSession = () => _storage.getIncompleteSession();
export const deleteSession = (id: string) => _storage.deleteSession(id);
export const clearAllStorage = () => _storage.clearAll();
export const saveAudioChunk = (sessionId: string, chunk: Blob, mimeType: string) =>
  _storage.saveAudioChunk(sessionId, chunk, mimeType);
export const getAudioBlob = (sessionId: string) => _storage.getAudioBlob(sessionId);
export const getAudioMimeType = (sessionId: string) => _storage.getAudioMimeType(sessionId);
export const deleteAudio = (sessionId: string) => _storage.deleteAudio(sessionId);
export const getStorageStats = () => _storage.getStats();
