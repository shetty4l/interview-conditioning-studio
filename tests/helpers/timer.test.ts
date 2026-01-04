import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTimer, type Timer } from "../../web/src/helpers/timer";

describe("createTimer", () => {
  let timer: Timer;
  let ticks: number[];
  let expireCalled: boolean;

  beforeEach(() => {
    ticks = [];
    expireCalled = false;
    timer = createTimer({
      onTick: (remaining) => ticks.push(remaining),
      onExpire: () => {
        expireCalled = true;
      },
    });
  });

  afterEach(() => {
    timer.stop();
  });

  describe("initial state", () => {
    it("should not be running initially", () => {
      expect(timer.isRunning()).toBe(false);
    });

    it("should not be paused initially", () => {
      expect(timer.isPaused()).toBe(false);
    });

    it("should have 0 remaining time initially", () => {
      expect(timer.getRemaining()).toBe(0);
    });
  });

  describe("start", () => {
    it("should set running state to true", () => {
      timer.start(5000);
      expect(timer.isRunning()).toBe(true);
    });

    it("should set remaining time to duration", () => {
      timer.start(5000);
      expect(timer.getRemaining()).toBe(5000);
    });

    it("should call onTick immediately with initial value", () => {
      timer.start(5000);
      expect(ticks).toEqual([5000]);
    });

    it("should call onTick after 1 second with decremented value", async () => {
      timer.start(3000);
      expect(ticks).toEqual([3000]);

      await sleep(1100);
      expect(ticks).toEqual([3000, 2000]);
    });

    it("should call onExpire when timer reaches 0", async () => {
      timer.start(2000);
      expect(expireCalled).toBe(false);

      await sleep(2100);
      expect(expireCalled).toBe(true);
      expect(ticks).toContain(0);
    });

    it("should stop running after expiry", async () => {
      timer.start(1000);
      await sleep(1100);

      expect(timer.isRunning()).toBe(false);
      expect(timer.getRemaining()).toBe(0);
    });

    it("should reset if started while already running", async () => {
      timer.start(5000);
      await sleep(1100);

      timer.start(3000);
      expect(timer.getRemaining()).toBe(3000);
      expect(ticks[ticks.length - 1]).toBe(3000);
    });
  });

  describe("stop", () => {
    it("should set running state to false", () => {
      timer.start(5000);
      timer.stop();
      expect(timer.isRunning()).toBe(false);
    });

    it("should reset remaining time to 0", () => {
      timer.start(5000);
      timer.stop();
      expect(timer.getRemaining()).toBe(0);
    });

    it("should stop the interval (no more ticks)", async () => {
      timer.start(5000);
      timer.stop();
      const tickCount = ticks.length;

      await sleep(1100);
      expect(ticks.length).toBe(tickCount);
    });

    it("should be safe to call when not running", () => {
      expect(() => timer.stop()).not.toThrow();
    });
  });

  describe("pause", () => {
    it("should set paused state to true", () => {
      timer.start(5000);
      timer.pause();
      expect(timer.isPaused()).toBe(true);
    });

    it("should preserve remaining time", () => {
      timer.start(5000);
      timer.pause();
      expect(timer.getRemaining()).toBe(5000);
    });

    it("should stop ticks while paused", async () => {
      timer.start(5000);
      timer.pause();
      const remaining = timer.getRemaining();

      await sleep(1100);
      expect(timer.getRemaining()).toBe(remaining);
    });

    it("should keep running state true while paused", () => {
      timer.start(5000);
      timer.pause();
      expect(timer.isRunning()).toBe(true);
    });

    it("should be no-op if not running", () => {
      timer.pause();
      expect(timer.isPaused()).toBe(false);
    });

    it("should be no-op if already paused", () => {
      timer.start(5000);
      timer.pause();
      timer.pause();
      expect(timer.isPaused()).toBe(true);
    });
  });

  describe("resume", () => {
    it("should set paused state to false", () => {
      timer.start(5000);
      timer.pause();
      timer.resume();
      expect(timer.isPaused()).toBe(false);
    });

    it("should resume ticking", async () => {
      timer.start(5000);
      timer.pause();
      const ticksBefore = ticks.length;

      timer.resume();
      await sleep(1100);

      expect(ticks.length).toBeGreaterThan(ticksBefore);
    });

    it("should be no-op if not running", () => {
      timer.resume();
      expect(timer.isRunning()).toBe(false);
    });

    it("should be no-op if not paused", () => {
      timer.start(5000);
      timer.resume(); // Not paused, should be no-op
      expect(timer.isPaused()).toBe(false);
    });
  });

  describe("countdown accuracy", () => {
    it("should count down correctly over multiple seconds", async () => {
      timer.start(4000);
      await sleep(3100);

      // Should have ticked: 4000, 3000, 2000, 1000
      expect(ticks).toEqual([4000, 3000, 2000, 1000]);
      expect(timer.getRemaining()).toBe(1000);
    });

    it("should not go below 0", async () => {
      timer.start(2000);
      await sleep(3100);

      // All tick values should be >= 0
      expect(ticks.every((t) => t >= 0)).toBe(true);
      expect(timer.getRemaining()).toBe(0);
    });
  });
});

// Helper to wait for a given time
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
