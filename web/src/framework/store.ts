/**
 * Store
 *
 * Global state container with reactive getters and actions.
 */

import { signal } from "./reactive";

// ============================================================================
// Types
// ============================================================================

type SetState<T> = (updater: Partial<T> | ((state: T) => Partial<T>)) => void;
type GetState<T> = () => T;

interface StoreConfig<T extends object, A extends object> {
  state: T;
  actions: (set: SetState<T>, get: GetState<T>) => A;
}

interface Store<T extends object, A extends object> {
  getSnapshot: () => T;
  getActions: () => A;
  /** Internal: signals for each state property */
  _signals: { [K in keyof T]: [() => T[K], (v: T[K]) => void] };
}

type ReactiveState<T extends object> = {
  [K in keyof T]: () => T[K];
};

// ============================================================================
// createStore
// ============================================================================

/**
 * Create a global store with state and actions.
 *
 * @param config - Store configuration with state and actions
 * @returns Store object
 */
export function createStore<T extends object, A extends object>(
  config: StoreConfig<T, A>,
): Store<T, A> {
  // Create a signal for each state property
  const signals = {} as { [K in keyof T]: [() => T[K], (v: T[K]) => void] };

  for (const key of Object.keys(config.state) as (keyof T)[]) {
    signals[key] = signal(config.state[key]);
  }

  // Get current state snapshot
  const get: GetState<T> = () => {
    const snapshot = {} as T;
    for (const key of Object.keys(signals) as (keyof T)[]) {
      snapshot[key] = signals[key][0]();
    }
    return snapshot;
  };

  // Set state (partial update)
  const set: SetState<T> = (updater) => {
    const updates = typeof updater === "function" ? updater(get()) : updater;

    for (const key of Object.keys(updates) as (keyof T)[]) {
      if (key in signals) {
        signals[key][1](updates[key] as T[keyof T]);
      }
    }
  };

  // Create actions with set and get bound
  const actions = config.actions(set, get);

  return {
    getSnapshot: get,
    getActions: () => actions,
    _signals: signals,
  };
}

// ============================================================================
// useStore
// ============================================================================

/**
 * Get reactive state getters from a store.
 *
 * @param store - Store to read from
 * @returns Object with getter functions for each state property
 */
export function useStore<T extends object, A extends object>(store: Store<T, A>): ReactiveState<T> {
  const state = {} as ReactiveState<T>;

  for (const key of Object.keys(store._signals) as (keyof T)[]) {
    state[key] = store._signals[key][0];
  }

  return state;
}

// ============================================================================
// useActions
// ============================================================================

/**
 * Get actions from a store.
 *
 * @param store - Store to get actions from
 * @returns Actions object
 */
export function useActions<T extends object, A extends object>(store: Store<T, A>): A {
  return store.getActions();
}
