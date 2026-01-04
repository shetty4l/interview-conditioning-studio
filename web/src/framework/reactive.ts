/**
 * Reactive Primitives
 *
 * Fine-grained reactivity system with signals, derived values, and watchers.
 */

// ============================================================================
// Types
// ============================================================================

type Subscriber = () => void;
type Cleanup = () => void;
type SignalGetter<T> = () => T;
type SignalSetter<T> = (value: T | ((prev: T) => T)) => void;

// ============================================================================
// Global State
// ============================================================================

/** Current subscriber being tracked for dependency collection */
let currentSubscriber: Subscriber | null = null;

/** Batch depth counter for nested batches */
let batchDepth = 0;

/** Pending subscribers to notify after batch completes */
const pendingSubscribers = new Set<Subscriber>();

// ============================================================================
// Signal
// ============================================================================

/**
 * Create a reactive signal.
 *
 * @param initialValue - The initial value
 * @returns Tuple of [getter, setter]
 *
 * @example
 * const [count, setCount] = signal(0);
 * count();              // read: 0
 * setCount(1);          // write
 * setCount(n => n + 1); // update function
 */
export function signal<T>(initialValue: T): [SignalGetter<T>, SignalSetter<T>] {
  let value = initialValue;
  const subscribers = new Set<Subscriber>();

  const get: SignalGetter<T> = () => {
    // Track this signal as a dependency of the current subscriber
    if (currentSubscriber) {
      subscribers.add(currentSubscriber);
    }
    return value;
  };

  const set: SignalSetter<T> = (newValue) => {
    const nextValue =
      typeof newValue === "function" ? (newValue as (prev: T) => T)(value) : newValue;

    // Skip if value hasn't changed (using Object.is for NaN handling)
    if (Object.is(value, nextValue)) {
      return;
    }

    value = nextValue;

    // Always notify subscribers immediately
    // Derived values will mark themselves dirty
    // Watchers will handle batching internally
    for (const sub of subscribers) {
      sub();
    }
  };

  return [get, set];
}

// ============================================================================
// Derived
// ============================================================================

/**
 * Create a derived (computed) value that auto-updates when dependencies change.
 *
 * @param fn - Function that computes the derived value
 * @returns Getter function for the derived value
 *
 * @example
 * const [count] = signal(5);
 * const doubled = derived(() => count() * 2);
 * doubled(); // 10
 */
export function derived<T>(fn: () => T): SignalGetter<T> {
  let cachedValue: T;
  let isDirty = true;
  const subscribers = new Set<Subscriber>();

  // Mark this derived value as dirty when dependencies change
  // This is called immediately by signals when they change
  const markDirty = () => {
    if (!isDirty) {
      isDirty = true;
      // Notify our subscribers (watchers or other derived values)
      // They will handle their own batching if needed
      for (const sub of subscribers) {
        sub();
      }
    }
  };

  const get: SignalGetter<T> = () => {
    // Track this derived as a dependency of the current subscriber
    if (currentSubscriber) {
      subscribers.add(currentSubscriber);
    }

    // Recompute if dirty
    if (isDirty) {
      const prevSubscriber = currentSubscriber;
      currentSubscriber = markDirty;
      try {
        cachedValue = fn();
        isDirty = false;
      } finally {
        currentSubscriber = prevSubscriber;
      }
    }

    return cachedValue;
  };

  return get;
}

// ============================================================================
// Watch
// ============================================================================

/**
 * Create a watcher that runs when dependencies change.
 *
 * @param fn - Function to run (can return a cleanup function)
 * @returns Cleanup function to stop watching
 *
 * @example
 * const [count] = signal(5);
 * const cleanup = watch(() => {
 *   console.log("Count is:", count());
 * });
 * cleanup(); // stop watching
 */
export function watch(fn: () => void | Cleanup): Cleanup {
  let cleanup: Cleanup | undefined;
  let isActive = true;
  let isScheduled = false;

  const run = () => {
    if (!isActive) return;

    // Handle batching - defer execution until batch completes
    if (batchDepth > 0) {
      if (!isScheduled) {
        isScheduled = true;
        pendingSubscribers.add(execute);
      }
      return;
    }

    execute();
  };

  const execute = () => {
    isScheduled = false;
    if (!isActive) return;

    // Run previous cleanup if any
    if (cleanup && typeof cleanup === "function") {
      cleanup();
      cleanup = undefined;
    }

    // Run the watcher and collect dependencies
    const prevSubscriber = currentSubscriber;
    currentSubscriber = run;
    try {
      const result = fn();
      // Only store cleanup if it's a function
      if (typeof result === "function") {
        cleanup = result;
      }
    } finally {
      currentSubscriber = prevSubscriber;
    }
  };

  // Run immediately
  execute();

  // Return cleanup function
  return () => {
    isActive = false;
    if (cleanup && typeof cleanup === "function") {
      cleanup();
      cleanup = undefined;
    }
  };
}

// ============================================================================
// Batch
// ============================================================================

/**
 * Batch multiple signal updates into a single notification.
 *
 * @param fn - Function containing signal updates
 * @returns Return value of fn
 *
 * @example
 * batch(() => {
 *   setCount(1);
 *   setName("foo");
 *   // Only one notification after batch completes
 * });
 */
export function batch<T>(fn: () => T): T {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0 && pendingSubscribers.size > 0) {
      // Flush pending notifications
      const subscribers = [...pendingSubscribers];
      pendingSubscribers.clear();
      for (const sub of subscribers) {
        sub();
      }
    }
  }
}
