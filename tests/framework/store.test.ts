/**
 * Store Tests
 *
 * TDD tests for createStore, useStore, and useActions.
 */

import { describe, test, expect } from "bun:test";
import { createStore, useStore, useActions } from "../../web/src/framework/store";
import { watch } from "../../web/src/framework/reactive";

describe("createStore", () => {
  test("initializes with state", () => {
    const store = createStore({
      state: { count: 0, name: "test" },
      actions: () => ({}),
    });

    const snapshot = store.getSnapshot();
    expect(snapshot.count).toBe(0);
    expect(snapshot.name).toBe("test");
  });

  test("getSnapshot returns plain object", () => {
    const store = createStore({
      state: { value: 42 },
      actions: () => ({}),
    });

    const snapshot = store.getSnapshot();
    expect(typeof snapshot).toBe("object");
    expect(snapshot.value).toBe(42);
  });

  test("getSnapshot returns current state", () => {
    const store = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
    });

    expect(store.getSnapshot().count).toBe(0);

    store.getActions().increment();
    expect(store.getSnapshot().count).toBe(1);
  });
});

describe("actions", () => {
  test("actions can update state via set", () => {
    const store = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
        decrement: () => set((s) => ({ count: s.count - 1 })),
      }),
    });

    const actions = store.getActions();

    actions.increment();
    expect(store.getSnapshot().count).toBe(1);

    actions.increment();
    expect(store.getSnapshot().count).toBe(2);

    actions.decrement();
    expect(store.getSnapshot().count).toBe(1);
  });

  test("set does partial merge", () => {
    const store = createStore({
      state: { count: 0, name: "test" },
      actions: (set) => ({
        setCount: (n: number) => set({ count: n }),
        setName: (n: string) => set({ name: n }),
      }),
    });

    const actions = store.getActions();

    actions.setCount(5);
    expect(store.getSnapshot()).toEqual({ count: 5, name: "test" });

    actions.setName("updated");
    expect(store.getSnapshot()).toEqual({ count: 5, name: "updated" });
  });

  test("actions have access to get for reading state", () => {
    const store = createStore({
      state: { count: 5 },
      actions: (set, get) => ({
        double: () => {
          const current = get().count;
          set({ count: current * 2 });
        },
      }),
    });

    const actions = store.getActions();

    actions.double();
    expect(store.getSnapshot().count).toBe(10);
  });

  test("async actions work correctly", async () => {
    const store = createStore({
      state: { data: null as string | null, loading: false },
      actions: (set) => ({
        fetchData: async () => {
          set({ loading: true });
          // Simulate async operation
          await new Promise((r) => setTimeout(r, 10));
          set({ data: "loaded", loading: false });
        },
      }),
    });

    const actions = store.getActions();

    expect(store.getSnapshot().loading).toBe(false);

    const promise = actions.fetchData();
    expect(store.getSnapshot().loading).toBe(true);

    await promise;
    expect(store.getSnapshot().loading).toBe(false);
    expect(store.getSnapshot().data).toBe("loaded");
  });
});

describe("useStore", () => {
  test("returns reactive getters", () => {
    const store = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
    });

    const state = useStore(store);

    expect(typeof state.count).toBe("function");
    expect(state.count()).toBe(0);

    store.getActions().increment();
    expect(state.count()).toBe(1);
  });

  test("reactive getters work with watch", () => {
    const store = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
    });

    const state = useStore(store);
    const values: number[] = [];

    watch(() => {
      values.push(state.count());
    });

    expect(values).toEqual([0]);

    store.getActions().increment();
    expect(values).toEqual([0, 1]);

    store.getActions().increment();
    expect(values).toEqual([0, 1, 2]);
  });

  test("only affected getters trigger updates", () => {
    const store = createStore({
      state: { a: 0, b: 0 },
      actions: (set) => ({
        incrementA: () => set((s) => ({ a: s.a + 1 })),
        incrementB: () => set((s) => ({ b: s.b + 1 })),
      }),
    });

    const state = useStore(store);
    const aValues: number[] = [];
    const bValues: number[] = [];

    watch(() => {
      aValues.push(state.a());
    });
    watch(() => {
      bValues.push(state.b());
    });

    expect(aValues).toEqual([0]);
    expect(bValues).toEqual([0]);

    store.getActions().incrementA();
    expect(aValues).toEqual([0, 1]);
    expect(bValues).toEqual([0]); // b watcher should not fire

    store.getActions().incrementB();
    expect(aValues).toEqual([0, 1]); // a watcher should not fire
    expect(bValues).toEqual([0, 1]);
  });
});

describe("useActions", () => {
  test("returns actions object", () => {
    const store = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
        reset: () => set({ count: 0 }),
      }),
    });

    const actions = useActions(store);

    expect(typeof actions.increment).toBe("function");
    expect(typeof actions.reset).toBe("function");
  });

  test("actions update state correctly", () => {
    const store = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
    });

    const state = useStore(store);
    const actions = useActions(store);

    expect(state.count()).toBe(0);

    actions.increment();
    expect(state.count()).toBe(1);
  });

  test("actions are stable references", () => {
    const store = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
    });

    const actions1 = useActions(store);
    const actions2 = useActions(store);

    expect(actions1).toBe(actions2);
  });
});
