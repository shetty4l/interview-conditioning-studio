/**
 * Component Lifecycle Tests
 *
 * TDD tests for mount, onMount, onCleanup, and context.
 */

import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { signal } from "../../web/src/framework/reactive";
import { div, span } from "../../web/src/framework/elements";
import {
  mount,
  onMount,
  onCleanup,
  createContext,
  useContext,
} from "../../web/src/framework/component";

// Helper to create a container for DOM tests
let container: HTMLElement;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
});

describe("mount", () => {
  test("appends component result to target", () => {
    function App() {
      return div({}, ["Hello"]);
    }

    mount(App, container);

    expect(container.textContent).toBe("Hello");
    expect(container.children.length).toBe(1);
    expect(container.children[0].tagName).toBe("DIV");
  });

  test("returns unmount function", () => {
    function App() {
      return div({}, ["Hello"]);
    }

    const unmount = mount(App, container);

    expect(typeof unmount).toBe("function");
    expect(container.textContent).toBe("Hello");

    unmount();

    expect(container.textContent).toBe("");
    expect(container.children.length).toBe(0);
  });

  test("supports reactive components", () => {
    const [count, setCount] = signal(0);

    function App() {
      return div({}, [() => `Count: ${count()}`]);
    }

    mount(App, container);
    expect(container.textContent).toBe("Count: 0");

    setCount(5);
    expect(container.textContent).toBe("Count: 5");
  });

  test("multiple mounts append in order", () => {
    function A() {
      return span({}, ["A"]);
    }
    function B() {
      return span({}, ["B"]);
    }

    mount(A, container);
    mount(B, container);

    expect(container.textContent).toBe("AB");
    expect(container.children.length).toBe(2);
  });
});

describe("onMount", () => {
  test("callback runs after mount", () => {
    const callback = mock(() => {});

    function App() {
      onMount(callback);
      return div({}, ["Hello"]);
    }

    expect(callback).not.toHaveBeenCalled();

    mount(App, container);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("callback has access to DOM", () => {
    let foundElement = false;

    function App() {
      onMount(() => {
        foundElement = container.textContent === "Hello";
      });
      return div({}, ["Hello"]);
    }

    mount(App, container);

    expect(foundElement).toBe(true);
  });

  test("cleanup returned from onMount runs on unmount", () => {
    const cleanup = mock(() => {});

    function App() {
      onMount(() => {
        return cleanup;
      });
      return div({}, ["Hello"]);
    }

    const unmount = mount(App, container);

    expect(cleanup).not.toHaveBeenCalled();

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test("multiple onMount callbacks run in order", () => {
    const order: number[] = [];

    function App() {
      onMount(() => order.push(1));
      onMount(() => order.push(2));
      onMount(() => order.push(3));
      return div({}, ["Hello"]);
    }

    mount(App, container);

    expect(order).toEqual([1, 2, 3]);
  });
});

describe("onCleanup", () => {
  test("runs on unmount", () => {
    const cleanup = mock(() => {});

    function App() {
      onCleanup(cleanup);
      return div({}, ["Hello"]);
    }

    const unmount = mount(App, container);

    expect(cleanup).not.toHaveBeenCalled();

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  test("multiple cleanups run in reverse order", () => {
    const order: number[] = [];

    function App() {
      onCleanup(() => order.push(1));
      onCleanup(() => order.push(2));
      onCleanup(() => order.push(3));
      return div({}, ["Hello"]);
    }

    const unmount = mount(App, container);
    unmount();

    expect(order).toEqual([3, 2, 1]);
  });

  test("onMount cleanups run before onCleanup cleanups", () => {
    const order: string[] = [];

    function App() {
      onMount(() => {
        return () => order.push("mount-cleanup");
      });
      onCleanup(() => order.push("cleanup"));
      return div({}, ["Hello"]);
    }

    const unmount = mount(App, container);
    unmount();

    // onMount cleanups first, then onCleanup
    expect(order).toEqual(["mount-cleanup", "cleanup"]);
  });
});

describe("createContext and useContext", () => {
  test("provides default value when no provider", () => {
    const ThemeContext = createContext("light");

    function App() {
      const theme = useContext(ThemeContext);
      return div({}, [theme]);
    }

    mount(App, container);

    expect(container.textContent).toBe("light");
  });

  test("provider overrides default value", () => {
    const ThemeContext = createContext("light");

    function App() {
      return ThemeContext.Provider({ value: "dark" }, () => [Child()]);
    }

    function Child() {
      const theme = useContext(ThemeContext);
      return div({}, [theme]);
    }

    mount(App, container);

    expect(container.textContent).toBe("dark");
  });

  test("nested providers - closest wins", () => {
    const ThemeContext = createContext("light");

    function App() {
      return ThemeContext.Provider({ value: "outer" }, () => [
        div({}, [ThemeContext.Provider({ value: "inner" }, () => [Child()])]),
      ]);
    }

    function Child() {
      const theme = useContext(ThemeContext);
      return span({}, [theme]);
    }

    mount(App, container);

    expect(container.textContent).toBe("inner");
  });

  test("sibling components get correct context", () => {
    const ThemeContext = createContext("default");

    function App() {
      return div({}, [
        ThemeContext.Provider({ value: "a" }, () => [ChildA()]),
        ThemeContext.Provider({ value: "b" }, () => [ChildB()]),
      ]);
    }

    function ChildA() {
      const theme = useContext(ThemeContext);
      return span({}, [`A:${theme}`]);
    }

    function ChildB() {
      const theme = useContext(ThemeContext);
      return span({}, [`B:${theme}`]);
    }

    mount(App, container);

    expect(container.textContent).toBe("A:aB:b");
  });

  test("context works with different types", () => {
    const NumberContext = createContext(0);
    const ObjectContext = createContext({ name: "default" });

    function App() {
      return div({}, [
        NumberContext.Provider({ value: 42 }, () => [NumberChild()]),
        ObjectContext.Provider({ value: { name: "custom" } }, () => [ObjectChild()]),
      ]);
    }

    function NumberChild() {
      const num = useContext(NumberContext);
      return span({}, [String(num)]);
    }

    function ObjectChild() {
      const obj = useContext(ObjectContext);
      return span({}, [obj.name]);
    }

    mount(App, container);

    expect(container.textContent).toBe("42custom");
  });
});

describe("nested components", () => {
  test("child components mount correctly", () => {
    function Parent() {
      return div({ class: "parent" }, [Child()]);
    }

    function Child() {
      return span({ class: "child" }, ["Child content"]);
    }

    mount(Parent, container);

    expect(container.querySelector(".parent")).not.toBeNull();
    expect(container.querySelector(".child")).not.toBeNull();
    expect(container.textContent).toBe("Child content");
  });

  test("child onMount runs after parent onMount (registration order)", () => {
    const order: string[] = [];

    function Parent() {
      onMount(() => order.push("parent"));
      return div({}, [Child()]);
    }

    function Child() {
      onMount(() => order.push("child"));
      return span({}, ["child"]);
    }

    mount(Parent, container);

    // Callbacks run in registration order
    expect(order).toEqual(["parent", "child"]);
  });

  test("child cleanups run before parent cleanups", () => {
    const order: string[] = [];

    function Parent() {
      onCleanup(() => order.push("parent"));
      return div({}, [Child()]);
    }

    function Child() {
      onCleanup(() => order.push("child"));
      return span({}, ["child"]);
    }

    const unmount = mount(Parent, container);
    unmount();

    // Children clean up first
    expect(order).toEqual(["child", "parent"]);
  });
});
