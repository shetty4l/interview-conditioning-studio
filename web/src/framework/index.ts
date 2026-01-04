/**
 * Reactive UI Framework
 *
 * A minimal reactive framework for building UI components.
 *
 * @example
 * import { signal, derived, div, Show, For, mount, createStore } from "./framework";
 *
 * // Create reactive state
 * const [count, setCount] = signal(0);
 * const doubled = derived(() => count() * 2);
 *
 * // Create elements
 * const App = () => div({ class: "app" }, [
 *   button({ onClick: () => setCount(c => c + 1) }, ["Increment"]),
 *   Show(() => count() > 0, () => span({}, [`Count: ${count()}`])),
 * ]);
 *
 * // Mount to DOM
 * mount(App, document.body);
 */

// ============================================================================
// Reactive Primitives
// ============================================================================

export { signal, derived, watch, batch } from "./reactive";

// ============================================================================
// Element Helpers
// ============================================================================

export {
  h,
  div,
  span,
  button,
  input,
  textarea,
  form,
  label,
  h1,
  h2,
  h3,
  p,
  pre,
  a,
  text,
  Show,
  For,
  Switch,
  type Child,
  type Children,
  type SwitchCase,
} from "./elements";

// ============================================================================
// Component Lifecycle
// ============================================================================

export { mount, onMount, onCleanup, createContext, useContext, createRoot } from "./component";

// ============================================================================
// Store
// ============================================================================

export { createStore, useStore, useActions } from "./store";

// ============================================================================
// Router
// ============================================================================

export {
  createRouter,
  useRouter,
  useRoute,
  Link,
  _resetRouterContext,
  type RouteConfig,
  type RouterOptions,
  type RouterInstance,
  type RouteInfo,
} from "./router";
