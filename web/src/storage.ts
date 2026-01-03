/**
 * IndexedDB Storage
 *
 * Persistent storage for sessions and audio using IndexedDB.
 * Provides async API for save/load operations.
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
// Database Connection
// ============================================================================

let db: IDBDatabase | null = null;

/**
 * Initialize the database connection.
 * Must be called before any other storage operations.
 */
export async function initStorage(): Promise<void> {
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
}

/**
 * Get the database connection, throwing if not initialized.
 */
function getDb(): IDBDatabase {
  if (!db) {
    throw new Error("Storage not initialized. Call initStorage() first.");
  }
  return db;
}

/**
 * Check if storage is initialized.
 */
export function isStorageInitialized(): boolean {
  return db !== null;
}

// ============================================================================
// Session Operations
// ============================================================================

/**
 * Save a session to storage.
 * Creates new or updates existing session.
 */
export async function saveSession(session: StoredSession): Promise<void> {
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
}

/**
 * Get a session by ID.
 * Returns null if not found.
 */
export async function getSession(id: string): Promise<StoredSession | null> {
  const database = getDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.SESSIONS, "readonly");
    const store = transaction.objectStore(STORES.SESSIONS);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

/**
 * Get all sessions, sorted by most recently updated.
 */
export async function getAllSessions(): Promise<StoredSession[]> {
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
}

/**
 * Get the most recent incomplete session (for resume flow).
 * Returns null if no incomplete sessions exist.
 */
export async function getIncompleteSession(): Promise<StoredSession | null> {
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
}

/**
 * Delete a session by ID.
 * Also deletes associated audio.
 */
export async function deleteSession(id: string): Promise<void> {
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
}

/**
 * Clear all sessions and audio.
 * Use with caution!
 */
export async function clearAllStorage(): Promise<void> {
  const database = getDb();

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([STORES.SESSIONS, STORES.AUDIO], "readwrite");

    transaction.objectStore(STORES.SESSIONS).clear();
    transaction.objectStore(STORES.AUDIO).clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============================================================================
// Audio Operations
// ============================================================================

/**
 * Save an audio chunk for a session.
 * Appends to existing chunks if any.
 */
export async function saveAudioChunk(
  sessionId: string,
  chunk: Blob,
  mimeType: string,
): Promise<void> {
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
}

/**
 * Get raw audio data for a session.
 */
async function getAudioData(sessionId: string): Promise<StoredAudio | null> {
  const database = getDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.AUDIO, "readonly");
    const store = transaction.objectStore(STORES.AUDIO);
    const request = store.get(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ?? null);
  });
}

/**
 * Get combined audio blob for a session.
 * Returns null if no audio exists.
 */
export async function getAudioBlob(sessionId: string): Promise<Blob | null> {
  const audioData = await getAudioData(sessionId);

  if (!audioData || audioData.chunks.length === 0) {
    return null;
  }

  return new Blob(audioData.chunks, { type: audioData.mimeType });
}

/**
 * Get audio mime type for a session.
 */
export async function getAudioMimeType(sessionId: string): Promise<string | null> {
  const audioData = await getAudioData(sessionId);
  return audioData?.mimeType ?? null;
}

/**
 * Delete audio for a session.
 */
export async function deleteAudio(sessionId: string): Promise<void> {
  const database = getDb();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORES.AUDIO, "readwrite");
    const store = transaction.objectStore(STORES.AUDIO);
    const request = store.delete(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Get storage statistics.
 */
export async function getStorageStats(): Promise<{
  sessionCount: number;
  audioCount: number;
}> {
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
}
