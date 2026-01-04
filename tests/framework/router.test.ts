/**
 * Router Tests
 *
 * Tests for the hash-based router framework utilities.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import {
  createRouter,
  useRouter,
  useRoute,
  Link,
  type RouteConfig,
  type RouterInstance,
} from "../../web/src/framework/router";
import { mount } from "../../web/src/framework/component";
import { div, span } from "../../web/src/framework/elements";

describe("Router", () => {
  let container: HTMLElement;
  let originalHash: string;
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    originalHash = window.location.hash;
    window.location.hash = "";
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
    container.remove();
    window.location.hash = originalHash;
  });

  // ============================================================================
  // createRouter
  // ============================================================================

  describe("createRouter", () => {
    test("should create a router with routes", () => {
      const routes: RouteConfig[] = [
        { path: "/", component: () => div({}, ["Home"]) },
        { path: "/about", component: () => div({}, ["About"]) },
      ];

      const Router = createRouter(routes);
      expect(typeof Router).toBe("function");
    });

    test("should render the matching route component", () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        { path: "/", component: () => div({ class: "home" }, ["Home Page"]) },
        { path: "/about", component: () => div({ class: "about" }, ["About Page"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".home")).not.toBeNull();
      expect(container.textContent).toBe("Home Page");
    });

    test("should render different route when hash changes", async () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        { path: "/", component: () => div({ class: "home" }, ["Home"]) },
        { path: "/about", component: () => div({ class: "about" }, ["About"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".home")).not.toBeNull();

      // Change hash
      window.location.hash = "#/about";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      // Wait for update
      await new Promise((r) => setTimeout(r, 0));

      expect(container.querySelector(".about")).not.toBeNull();
      expect(container.textContent).toBe("About");
    });

    test("should render fallback for unmatched routes", () => {
      window.location.hash = "#/unknown";

      const routes: RouteConfig[] = [{ path: "/", component: () => div({}, ["Home"]) }];

      const Router = createRouter(routes, {
        fallback: () => div({ class: "not-found" }, ["404 Not Found"]),
      });
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".not-found")).not.toBeNull();
      expect(container.textContent).toBe("404 Not Found");
    });

    test("should render nothing for unmatched routes without fallback", () => {
      window.location.hash = "#/unknown";

      const routes: RouteConfig[] = [{ path: "/", component: () => div({}, ["Home"]) }];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.textContent).toBe("");
    });

    test("should extract route params", () => {
      window.location.hash = "#/user/123";
      let capturedParams: Record<string, string> = {};

      const routes: RouteConfig[] = [
        {
          path: "/user/:id",
          component: () => {
            const route = useRoute();
            capturedParams = route.params;
            return div({}, [`User ${route.params.id}`]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(capturedParams).toEqual({ id: "123" });
      expect(container.textContent).toBe("User 123");
    });

    test("should extract multiple route params", () => {
      window.location.hash = "#/org/acme/user/456";

      let capturedParams: Record<string, string> = {};

      const routes: RouteConfig[] = [
        {
          path: "/org/:orgId/user/:userId",
          component: () => {
            const route = useRoute();
            capturedParams = route.params;
            return div({}, [`Org ${route.params.orgId}, User ${route.params.userId}`]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(capturedParams).toEqual({ orgId: "acme", userId: "456" });
    });

    test("should match routes in order (first match wins)", () => {
      window.location.hash = "#/user/new";

      const routes: RouteConfig[] = [
        { path: "/user/new", component: () => div({ class: "new-user" }, ["New User Form"]) },
        { path: "/user/:id", component: () => div({ class: "user-detail" }, ["User Detail"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".new-user")).not.toBeNull();
    });

    test("should handle empty hash as root route", () => {
      window.location.hash = "";

      const routes: RouteConfig[] = [
        { path: "/", component: () => div({ class: "home" }, ["Home"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".home")).not.toBeNull();
    });

    test("should handle hash with only #", () => {
      window.location.hash = "#";

      const routes: RouteConfig[] = [
        { path: "/", component: () => div({ class: "home" }, ["Home"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".home")).not.toBeNull();
    });

    test("should handle hash with #/", () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        { path: "/", component: () => div({ class: "home" }, ["Home"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".home")).not.toBeNull();
    });

    test("should cleanup hashchange listener on unmount", () => {
      window.location.hash = "#/";
      const removeEventListenerSpy = spyOn(window, "removeEventListener");

      const routes: RouteConfig[] = [{ path: "/", component: () => div({}, ["Home"]) }];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);
      cleanup();
      cleanup = null;

      expect(removeEventListenerSpy).toHaveBeenCalledWith("hashchange", expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  // ============================================================================
  // useRouter
  // ============================================================================

  describe("useRouter", () => {
    test("should provide navigate function", () => {
      window.location.hash = "#/";
      let router: RouterInstance | null = null;

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => {
            router = useRouter();
            return div({}, ["Home"]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(router).not.toBeNull();
      expect(typeof router!.navigate).toBe("function");
    });

    test("navigate should update hash", () => {
      window.location.hash = "#/";
      let router: RouterInstance | null = null;

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => {
            router = useRouter();
            return div({}, ["Home"]);
          },
        },
        { path: "/about", component: () => div({}, ["About"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      router!.navigate("/about");

      expect(window.location.hash).toBe("#/about");
    });

    test("navigate should trigger route change", async () => {
      window.location.hash = "#/";
      let router: RouterInstance | null = null;

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => {
            router = useRouter();
            return div({ class: "home" }, ["Home"]);
          },
        },
        { path: "/about", component: () => div({ class: "about" }, ["About"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      router!.navigate("/about");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      await new Promise((r) => setTimeout(r, 0));

      expect(container.querySelector(".about")).not.toBeNull();
    });

    test("should provide back function", () => {
      window.location.hash = "#/";
      let router: RouterInstance | null = null;

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => {
            router = useRouter();
            return div({}, ["Home"]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(typeof router!.back).toBe("function");
    });

    test("back should call history.back", () => {
      window.location.hash = "#/";
      const backSpy = spyOn(history, "back");
      let router: RouterInstance | null = null;

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => {
            router = useRouter();
            return div({}, ["Home"]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      router!.back();

      expect(backSpy).toHaveBeenCalled();
      backSpy.mockRestore();
    });

    test("should throw when used outside router", () => {
      expect(() => {
        useRouter();
      }).toThrow();
    });
  });

  // ============================================================================
  // useRoute
  // ============================================================================

  describe("useRoute", () => {
    test("should provide current path", () => {
      window.location.hash = "#/about";
      let path = "";

      const routes: RouteConfig[] = [
        {
          path: "/about",
          component: () => {
            const route = useRoute();
            path = route.path;
            return div({}, ["About"]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(path).toBe("/about");
    });

    test("should provide params object", () => {
      window.location.hash = "#/user/42";
      let params: Record<string, string> = {};

      const routes: RouteConfig[] = [
        {
          path: "/user/:id",
          component: () => {
            const route = useRoute();
            params = route.params;
            return div({}, ["User"]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(params).toEqual({ id: "42" });
    });

    test("should provide empty params for routes without params", () => {
      window.location.hash = "#/about";
      let params: Record<string, string> = { initial: "value" };

      const routes: RouteConfig[] = [
        {
          path: "/about",
          component: () => {
            const route = useRoute();
            params = route.params;
            return div({}, ["About"]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(params).toEqual({});
    });

    test("should throw when used outside router", () => {
      expect(() => {
        useRoute();
      }).toThrow();
    });
  });

  // ============================================================================
  // Link
  // ============================================================================

  describe("Link", () => {
    test("should render an anchor element", () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => div({}, [Link({ href: "/about" }, ["Go to About"])]),
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      const anchor = container.querySelector("a");
      expect(anchor).not.toBeNull();
      expect(anchor!.textContent).toBe("Go to About");
    });

    test("should set href with hash prefix", () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => div({}, [Link({ href: "/about" }, ["About"])]),
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      const anchor = container.querySelector("a");
      expect(anchor!.getAttribute("href")).toBe("#/about");
    });

    test("should navigate on click", async () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => div({}, [Link({ href: "/about", class: "nav-link" }, ["About"])]),
        },
        { path: "/about", component: () => div({ class: "about" }, ["About Page"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      const anchor = container.querySelector("a.nav-link") as HTMLAnchorElement;
      anchor.click();

      await new Promise((r) => setTimeout(r, 0));

      expect(window.location.hash).toBe("#/about");
    });

    test("should apply additional props to anchor", () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () =>
            div({}, [
              Link({ href: "/about", class: "nav-link", "data-testid": "about-link" }, ["About"]),
            ]),
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      const anchor = container.querySelector("a");
      expect(anchor!.className).toBe("nav-link");
      expect(anchor!.getAttribute("data-testid")).toBe("about-link");
    });

    test("should support children as array with elements", () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => div({}, [Link({ href: "/about" }, [span({}, ["Icon"]), " About"])]),
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      const anchor = container.querySelector("a");
      expect(anchor!.querySelector("span")).not.toBeNull();
      expect(anchor!.textContent).toBe("Icon About");
    });

    test("should prevent default and use router navigation", () => {
      window.location.hash = "#/";
      let preventDefaultCalled = false;

      const routes: RouteConfig[] = [
        {
          path: "/",
          component: () => div({}, [Link({ href: "/about" }, ["About"])]),
        },
        { path: "/about", component: () => div({}, ["About"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      const anchor = container.querySelector("a") as HTMLAnchorElement;

      // Create a click event and spy on preventDefault
      const event = new MouseEvent("click", { bubbles: true, cancelable: true });
      const originalPreventDefault = event.preventDefault.bind(event);
      event.preventDefault = () => {
        preventDefaultCalled = true;
        originalPreventDefault();
      };

      anchor.dispatchEvent(event);

      expect(preventDefaultCalled).toBe(true);
    });
  });

  // ============================================================================
  // Path Matching
  // ============================================================================

  describe("Path Matching", () => {
    test("should match exact paths", () => {
      window.location.hash = "#/about";

      const routes: RouteConfig[] = [
        { path: "/", component: () => div({ class: "home" }, ["Home"]) },
        { path: "/about", component: () => div({ class: "about" }, ["About"]) },
        { path: "/about/team", component: () => div({ class: "team" }, ["Team"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".about")).not.toBeNull();
    });

    test("should not match partial paths", () => {
      window.location.hash = "#/about/team/member";

      const routes: RouteConfig[] = [
        { path: "/about", component: () => div({ class: "about" }, ["About"]) },
        { path: "/about/team", component: () => div({ class: "team" }, ["Team"]) },
      ];

      const Router = createRouter(routes, {
        fallback: () => div({ class: "not-found" }, ["Not Found"]),
      });
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".not-found")).not.toBeNull();
    });

    test("should handle trailing slashes consistently", () => {
      window.location.hash = "#/about/";

      const routes: RouteConfig[] = [
        { path: "/about", component: () => div({ class: "about" }, ["About"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".about")).not.toBeNull();
    });

    test("should handle query params in hash", () => {
      window.location.hash = "#/about?foo=bar";

      const routes: RouteConfig[] = [
        { path: "/about", component: () => div({ class: "about" }, ["About"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".about")).not.toBeNull();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe("Edge Cases", () => {
    test("should handle rapid hash changes", async () => {
      window.location.hash = "#/";

      const routes: RouteConfig[] = [
        { path: "/", component: () => div({ class: "home" }, ["Home"]) },
        { path: "/a", component: () => div({ class: "a" }, ["A"]) },
        { path: "/b", component: () => div({ class: "b" }, ["B"]) },
        { path: "/c", component: () => div({ class: "c" }, ["C"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      // Rapid changes
      window.location.hash = "#/a";
      window.location.hash = "#/b";
      window.location.hash = "#/c";
      window.dispatchEvent(new HashChangeEvent("hashchange"));

      await new Promise((r) => setTimeout(r, 10));

      expect(container.querySelector(".c")).not.toBeNull();
    });

    test("should handle special characters in params", () => {
      window.location.hash = "#/user/john%20doe";

      let params: Record<string, string> = {};

      const routes: RouteConfig[] = [
        {
          path: "/user/:name",
          component: () => {
            const route = useRoute();
            params = route.params;
            return div({}, [route.params.name]);
          },
        },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      // URL-encoded space
      expect(params.name).toBe("john%20doe");
    });

    test("should handle routes with similar prefixes", () => {
      window.location.hash = "#/users";

      const routes: RouteConfig[] = [
        { path: "/user", component: () => div({ class: "user" }, ["User"]) },
        { path: "/users", component: () => div({ class: "users" }, ["Users"]) },
      ];

      const Router = createRouter(routes);
      cleanup = mount(() => Router(), container);

      expect(container.querySelector(".users")).not.toBeNull();
    });
  });
});
