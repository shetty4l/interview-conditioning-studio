/**
 * Router - Hash-based routing for the reactive framework
 *
 * Provides declarative routing with param extraction and navigation utilities.
 */

import { signal } from "./reactive";
import { createRoot, onCleanup } from "./component";
import { type Child, h } from "./elements";

// ============================================================================
// Types
// ============================================================================

/** Route configuration */
export interface RouteConfig {
  path: string;
  component: () => HTMLElement | null;
}

/** Router options */
export interface RouterOptions {
  fallback?: () => HTMLElement | null;
}

/** Router instance returned by useRouter */
export interface RouterInstance {
  navigate: (path: string) => void;
  back: () => void;
}

/** Route info returned by useRoute */
export interface RouteInfo {
  path: string;
  params: Record<string, string>;
}

/** Internal router context value */
interface RouterContextValue {
  navigate: (path: string) => void;
  back: () => void;
  currentPath: () => string;
  currentParams: () => Record<string, string>;
}

// ============================================================================
// Context
// ============================================================================

// Store router context globally - safe since there's only one router per app
let globalRouterContext: RouterContextValue | null = null;

/**
 * Reset the global router context.
 * Used for testing to ensure clean state between tests.
 */
export function _resetRouterContext(): void {
  globalRouterContext = null;
}

// ============================================================================
// Path Matching
// ============================================================================

/**
 * Parse hash into a path string.
 * Handles: "", "#", "#/", "#/path", "#/path?query"
 */
function parseHash(hash: string): string {
  // Remove leading #
  let path = hash.startsWith("#") ? hash.slice(1) : hash;

  // Strip query params
  const queryIndex = path.indexOf("?");
  if (queryIndex !== -1) {
    path = path.slice(0, queryIndex);
  }

  // Ensure leading /
  if (!path.startsWith("/")) {
    path = "/" + path;
  }

  // Remove trailing slash (except for root)
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  return path;
}

/**
 * Match a path against a route pattern.
 * Returns params if matched, null otherwise.
 *
 * Pattern syntax:
 * - /path - exact match
 * - /path/:param - single segment param
 */
function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = path.split("/").filter(Boolean);

  // Must have same number of segments for exact match
  if (patternSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i];
    const pathSeg = pathSegments[i];

    if (patternSeg.startsWith(":")) {
      // Param segment - extract value
      const paramName = patternSeg.slice(1);
      params[paramName] = pathSeg;
    } else if (patternSeg !== pathSeg) {
      // Literal segment - must match exactly
      return null;
    }
  }

  return params;
}

// ============================================================================
// createRouter
// ============================================================================

/**
 * Create a router component from route configurations.
 *
 * @example
 * const Router = createRouter([
 *   { path: "/", component: Home },
 *   { path: "/user/:id", component: UserDetail },
 * ], { fallback: NotFound });
 *
 * mount(() => Router(), document.body);
 */
export function createRouter(
  routes: RouteConfig[],
  options: RouterOptions = {},
): () => HTMLElement {
  return function Router(): HTMLElement {
    // Current route state
    const [currentPath, setCurrentPath] = signal(parseHash(window.location.hash));
    const [currentParams, setCurrentParams] = signal<Record<string, string>>({});

    // Navigation functions
    const navigate = (path: string): void => {
      window.location.hash = "#" + path;
    };

    const back = (): void => {
      history.back();
    };

    // Context value - set globally so nested components can access it
    const contextValue: RouterContextValue = {
      navigate,
      back,
      currentPath,
      currentParams,
    };

    // Set global context so useRouter/useRoute work in nested components
    globalRouterContext = contextValue;

    // Create container
    const container = h("div", { class: "router" }, []);

    // Track current component's dispose function for cleanup
    let currentDispose: (() => void) | null = null;

    // Render function - finds and renders matching route
    const renderRoute = (): void => {
      const path = currentPath();

      // Dispose previous component before removing from DOM
      if (currentDispose) {
        currentDispose();
        currentDispose = null;
      }

      // Clear container
      container.innerHTML = "";

      // Find matching route
      for (const route of routes) {
        const params = matchRoute(route.path, path);
        if (params !== null) {
          // Update params
          setCurrentParams(params);

          // Render matched component in its own root scope for lifecycle hooks
          const { result, dispose } = createRoot(() => route.component());
          currentDispose = dispose;
          if (result) {
            container.appendChild(result);
          }
          return;
        }
      }

      // No match - render fallback if provided
      setCurrentParams({});
      if (options.fallback) {
        const { result, dispose } = createRoot(() => options.fallback!());
        currentDispose = dispose;
        if (result) {
          container.appendChild(result);
        }
      }
    };

    // Hash change handler
    const handleHashChange = (): void => {
      const path = parseHash(window.location.hash);
      setCurrentPath(path);
      renderRoute();
    };

    // Set up listener
    window.addEventListener("hashchange", handleHashChange);
    onCleanup(() => {
      window.removeEventListener("hashchange", handleHashChange);
      // Clean up current component when router is unmounted
      if (currentDispose) {
        currentDispose();
        currentDispose = null;
      }
    });

    // Initial render
    renderRoute();

    return container;
  };
}

// ============================================================================
// useRouter
// ============================================================================

/**
 * Get router navigation functions.
 * Must be called within a Router component.
 *
 * @example
 * const { navigate, back } = useRouter();
 * navigate("/about");
 */
export function useRouter(): RouterInstance {
  if (!globalRouterContext) {
    throw new Error("useRouter must be used within a Router component");
  }
  return {
    navigate: globalRouterContext.navigate,
    back: globalRouterContext.back,
  };
}

// ============================================================================
// useRoute
// ============================================================================

/**
 * Get current route information.
 * Must be called within a Router component.
 *
 * @example
 * const { path, params } = useRoute();
 * console.log(params.id); // For /user/:id route
 */
export function useRoute(): RouteInfo {
  if (!globalRouterContext) {
    throw new Error("useRoute must be used within a Router component");
  }
  return {
    path: globalRouterContext.currentPath(),
    params: globalRouterContext.currentParams(),
  };
}

// ============================================================================
// Link
// ============================================================================

interface LinkProps {
  href: string;
  class?: string;
  [key: string]: unknown;
}

/**
 * Navigation link component.
 * Renders an anchor that uses the router for navigation.
 *
 * @example
 * Link({ href: "/about", class: "nav-link" }, ["About Us"])
 */
export function Link(props: LinkProps, children: Child[]): HTMLElement {
  const { href, ...rest } = props;

  const handleClick = (e: Event): void => {
    e.preventDefault();
    window.location.hash = "#" + href;
  };

  return h(
    "a",
    {
      ...rest,
      href: "#" + href,
      onClick: handleClick,
    },
    children,
  );
}
