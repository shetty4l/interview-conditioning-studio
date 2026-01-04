/**
 * Component Lifecycle
 *
 * Mount, lifecycle hooks, and context for dependency injection.
 */

import { div } from "./elements";

// ============================================================================
// Types
// ============================================================================

type Cleanup = () => void;
type Component = () => Node;

interface Owner {
  onMountCallbacks: Array<() => void | Cleanup>;
  onCleanupCallbacks: Cleanup[];
  mountCleanups: Cleanup[];
  parent: Owner | null;
  contexts: Map<Context<unknown>, unknown>;
}

interface Context<T> {
  id: symbol;
  defaultValue: T;
  Provider: (props: { value: T }, children: (() => Node[]) | Node[]) => Node;
}

// ============================================================================
// Global State
// ============================================================================

/** Current component owner for lifecycle hook registration */
let currentOwner: Owner | null = null;

// ============================================================================
// Mount
// ============================================================================

/**
 * Mount a component to a DOM element.
 *
 * @param component - Component function to mount
 * @param target - Target DOM element
 * @returns Unmount function
 */
export function mount(component: Component, target: HTMLElement): Cleanup {
  // Create owner for this component tree
  const owner: Owner = {
    onMountCallbacks: [],
    onCleanupCallbacks: [],
    mountCleanups: [],
    parent: currentOwner,
    contexts: new Map(),
  };

  // Set current owner for hook registration
  const prevOwner = currentOwner;
  currentOwner = owner;

  let rootNode: Node;
  try {
    // Run the component
    rootNode = component();
  } finally {
    currentOwner = prevOwner;
  }

  // Append to DOM
  target.appendChild(rootNode);

  // Run onMount callbacks
  for (const callback of owner.onMountCallbacks) {
    const cleanup = callback();
    if (typeof cleanup === "function") {
      owner.mountCleanups.push(cleanup);
    }
  }

  // Return unmount function
  return () => {
    // Run mount cleanups first
    for (const cleanup of owner.mountCleanups) {
      cleanup();
    }

    // Run onCleanup callbacks in reverse order
    for (let i = owner.onCleanupCallbacks.length - 1; i >= 0; i--) {
      owner.onCleanupCallbacks[i]();
    }

    // Remove from DOM
    if (rootNode.parentNode) {
      rootNode.parentNode.removeChild(rootNode);
    }
  };
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

/**
 * Register a callback to run after the component is mounted to the DOM.
 * The returned cleanup function (if any) will run on unmount.
 *
 * @param callback - Function to run after mount
 */
export function onMount(callback: () => void | Cleanup): void {
  if (!currentOwner) {
    console.warn("onMount called outside of component context");
    return;
  }
  currentOwner.onMountCallbacks.push(callback);
}

/**
 * Register a cleanup function to run when the component unmounts.
 *
 * @param cleanup - Cleanup function
 */
export function onCleanup(cleanup: Cleanup): void {
  if (!currentOwner) {
    console.warn("onCleanup called outside of component context");
    return;
  }
  currentOwner.onCleanupCallbacks.push(cleanup);
}

// ============================================================================
// Context
// ============================================================================

/**
 * Create a context for dependency injection.
 *
 * @param defaultValue - Default value when no provider is found
 * @returns Context object with Provider component
 */
export function createContext<T>(defaultValue: T): Context<T> {
  const id = Symbol("context");

  const context: Context<T> = {
    id,
    defaultValue,
    Provider: (props: { value: T }, children: (() => Node[]) | Node[]) => {
      // Create a new owner scope for the provider's children
      const providerOwner: Owner = {
        onMountCallbacks: [],
        onCleanupCallbacks: [],
        mountCleanups: [],
        parent: currentOwner,
        contexts: new Map(),
      };

      // Set this context value on the provider's owner
      providerOwner.contexts.set(context as Context<unknown>, props.value);

      // Push the provider owner so children see it
      const prevOwner = currentOwner;
      currentOwner = providerOwner;

      // Return a container with the children
      const container = div({ style: { display: "contents" } }, []);

      // Evaluate children lazily if they're a function
      const childNodes = typeof children === "function" ? children() : children;
      for (const child of childNodes) {
        container.appendChild(child);
      }

      // Restore owner
      currentOwner = prevOwner;

      // Register cleanups from the provider's children with the parent owner
      if (prevOwner) {
        // Transfer any cleanup callbacks to parent
        for (const cb of providerOwner.onCleanupCallbacks) {
          prevOwner.onCleanupCallbacks.push(cb);
        }
        for (const cb of providerOwner.onMountCallbacks) {
          prevOwner.onMountCallbacks.push(cb);
        }
      }

      return container;
    },
  };

  return context;
}

/**
 * Get the current value of a context.
 *
 * @param context - Context to read
 * @returns Context value (from nearest provider or default)
 */
export function useContext<T>(context: Context<T>): T {
  // Walk up the owner chain looking for a provider
  let owner = currentOwner;
  while (owner) {
    if (owner.contexts.has(context as Context<unknown>)) {
      return owner.contexts.get(context as Context<unknown>) as T;
    }
    owner = owner.parent;
  }

  // No provider found, return default
  return context.defaultValue;
}
