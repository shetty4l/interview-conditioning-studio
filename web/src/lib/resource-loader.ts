/**
 * Generic lazy-loading utility for static resources.
 *
 * Creates a loader that fetches a resource once and caches it in memory.
 * Supports preloading for optimal UX (fetch in background before data is needed).
 */

export interface ResourceLoader<T> {
  /** Start fetching in background. Safe to call multiple times. */
  preload: () => void;
  /** Get the resource (waits for fetch if not cached). */
  get: () => Promise<T>;
  /** Get cached value synchronously (null if not loaded). */
  getCached: () => T | null;
}

export function createResourceLoader<T>(url: string): ResourceLoader<T> {
  let cache: T | null = null;
  let fetchPromise: Promise<T> | null = null;

  return {
    preload() {
      if (!cache && !fetchPromise) {
        fetchPromise = fetch(url)
          .then((res) => res.json())
          .then((data) => {
            cache = data;
            return data;
          });
      }
    },

    async get(): Promise<T> {
      if (cache) return cache;
      if (fetchPromise) return fetchPromise;
      this.preload();
      return fetchPromise!;
    },

    getCached(): T | null {
      return cache;
    },
  };
}
