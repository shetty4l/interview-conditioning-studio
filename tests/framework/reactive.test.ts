/**
 * Reactive Primitives Tests
 *
 * TDD tests for signal, derived, watch, and batch.
 */

import { describe, test, expect, mock } from "bun:test";
import { signal, derived, watch, batch } from "../../web/src/framework/reactive";

describe("signal", () => {
  test("returns tuple with getter and setter", () => {
    const [get, set] = signal(0);
    expect(typeof get).toBe("function");
    expect(typeof set).toBe("function");
  });

  test("getter returns initial value", () => {
    const [count] = signal(42);
    expect(count()).toBe(42);
  });

  test("setter updates value", () => {
    const [count, setCount] = signal(0);
    setCount(5);
    expect(count()).toBe(5);
  });

  test("setter accepts update function", () => {
    const [count, setCount] = signal(10);
    setCount((n) => n + 5);
    expect(count()).toBe(15);
  });

  test("works with different types", () => {
    const [str] = signal("hello");
    expect(str()).toBe("hello");

    const [obj] = signal({ x: 1 });
    expect(obj()).toEqual({ x: 1 });

    const [arr] = signal([1, 2, 3]);
    expect(arr()).toEqual([1, 2, 3]);

    const [nullable] = signal<string | null>(null);
    expect(nullable()).toBe(null);
  });
});

describe("derived", () => {
  test("computes value from signals", () => {
    const [count] = signal(5);
    const doubled = derived(() => count() * 2);
    expect(doubled()).toBe(10);
  });

  test("recomputes when dependency changes", () => {
    const [count, setCount] = signal(5);
    const doubled = derived(() => count() * 2);

    expect(doubled()).toBe(10);
    setCount(10);
    expect(doubled()).toBe(20);
  });

  test("caches value when dependencies unchanged", () => {
    const [count] = signal(5);
    let computeCount = 0;
    const doubled = derived(() => {
      computeCount++;
      return count() * 2;
    });

    // First read computes
    doubled();
    expect(computeCount).toBe(1);

    // Subsequent reads use cache
    doubled();
    doubled();
    expect(computeCount).toBe(1);
  });

  test("works with multiple dependencies", () => {
    const [a, setA] = signal(2);
    const [b, setB] = signal(3);
    const sum = derived(() => a() + b());

    expect(sum()).toBe(5);
    setA(10);
    expect(sum()).toBe(13);
    setB(7);
    expect(sum()).toBe(17);
  });

  test("supports nested derived values", () => {
    const [count, setCount] = signal(2);
    const doubled = derived(() => count() * 2);
    const quadrupled = derived(() => doubled() * 2);

    expect(quadrupled()).toBe(8);
    setCount(5);
    expect(quadrupled()).toBe(20);
  });
});

describe("watch", () => {
  test("runs immediately on creation", () => {
    const [count] = signal(5);
    const fn = mock(() => count());

    watch(fn);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("runs when dependency changes", () => {
    const [count, setCount] = signal(5);
    const fn = mock(() => count());

    watch(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    setCount(10);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("returns cleanup function that stops watching", () => {
    const [count, setCount] = signal(5);
    const fn = mock(() => count());

    const cleanup = watch(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    cleanup();

    setCount(10);
    setCount(20);
    // Should not have been called again after cleanup
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("tracks multiple dependencies", () => {
    const [a, setA] = signal(1);
    const [b, setB] = signal(2);
    const fn = mock(() => a() + b());

    watch(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    setA(5);
    expect(fn).toHaveBeenCalledTimes(2);

    setB(10);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("only runs once per batch of changes", () => {
    const [a, setA] = signal(1);
    const [b, setB] = signal(2);
    const fn = mock(() => a() + b());

    watch(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      setA(5);
      setB(10);
    });

    // Should only run once for the batch, not twice
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("batch", () => {
  test("coalesces multiple signal updates", () => {
    const [a, setA] = signal(1);
    const [b, setB] = signal(2);
    const fn = mock(() => a() + b());

    watch(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      setA(10);
      setB(20);
      setA(100);
      setB(200);
    });

    // Watch should only fire once after batch completes
    expect(fn).toHaveBeenCalledTimes(2);
    expect(a()).toBe(100);
    expect(b()).toBe(200);
  });

  test("returns value from batched function", () => {
    const result = batch(() => {
      return 42;
    });
    expect(result).toBe(42);
  });

  test("supports nested batches", () => {
    const [count, setCount] = signal(0);
    const fn = mock(() => count());

    watch(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    batch(() => {
      setCount(1);
      batch(() => {
        setCount(2);
        setCount(3);
      });
      setCount(4);
    });

    // Outer batch should control when effects run
    expect(fn).toHaveBeenCalledTimes(2);
    expect(count()).toBe(4);
  });

  test("derived values see intermediate state during batch", () => {
    const [count, setCount] = signal(0);
    const doubled = derived(() => count() * 2);

    batch(() => {
      setCount(5);
      // During batch, derived can see the updated value
      expect(doubled()).toBe(10);
      setCount(10);
      expect(doubled()).toBe(20);
    });

    expect(doubled()).toBe(20);
  });
});

describe("edge cases", () => {
  test("signal setter with same value does not trigger watchers", () => {
    const [count, setCount] = signal(5);
    const fn = mock(() => count());

    watch(fn);
    expect(fn).toHaveBeenCalledTimes(1);

    setCount(5); // same value
    // Should not trigger again
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("derived handles conditional dependencies", () => {
    const [toggle, setToggle] = signal(true);
    const [a] = signal(1);
    const [b, setB] = signal(2);

    // Only depends on 'a' when toggle is true, 'b' when false
    const result = derived(() => (toggle() ? a() : b()));

    expect(result()).toBe(1);

    // Changing b shouldn't affect result since we're using a
    setB(100);
    expect(result()).toBe(1);

    // Now switch to b
    setToggle(false);
    expect(result()).toBe(100);
  });

  test("watch cleanup is called on re-run", () => {
    const [count, setCount] = signal(0);
    const cleanupFn = mock(() => {});

    watch(() => {
      count(); // track dependency
      return cleanupFn;
    });

    expect(cleanupFn).not.toHaveBeenCalled();

    setCount(1);
    expect(cleanupFn).toHaveBeenCalledTimes(1);

    setCount(2);
    expect(cleanupFn).toHaveBeenCalledTimes(2);
  });

  test("errors in watch are propagated", () => {
    const [count, setCount] = signal(0);

    watch(() => {
      if (count() > 0) {
        throw new Error("Test error");
      }
    });

    expect(() => setCount(1)).toThrow("Test error");
  });

  test("errors in derived are propagated", () => {
    const [count, setCount] = signal(0);
    const problematic = derived(() => {
      if (count() > 0) {
        throw new Error("Derived error");
      }
      return count();
    });

    expect(problematic()).toBe(0);
    setCount(1);
    expect(() => problematic()).toThrow("Derived error");
  });
});
