import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createTimer, type Timer, type Clock } from "../../../web/src/helpers/timer";

// ============================================================================
// FakeClock for synchronous testing
// ============================================================================

interface FakeClock extends Clock {
  currentTime: number;
  tick(ms: number): void;
}

function createFakeClock(): FakeClock {
  let currentTime = 0;
  const intervals = new Map<
    ReturnType<typeof setInterval>,
    { fn: () => void; ms: number; nextFire: number }
  >();
  let nextId = 1;

  const tick = (ms: number) => {
    const targetTime = currentTime + ms;

    // Process intervals in order until we reach target time
    while (currentTime < targetTime) {
      // Find the next interval to fire (including those at exactly targetTime)
      let nextFireTime = Infinity;
      let nextInterval: { fn: () => void; ms: number; nextFire: number } | null = null;

      for (const [, interval] of intervals) {
        if (interval.nextFire <= targetTime && interval.nextFire < nextFireTime) {
          nextFireTime = interval.nextFire;
          nextInterval = interval;
        }
      }

      if (nextInterval && nextFireTime <= targetTime) {
        // Advance time to this interval's fire time
        currentTime = nextFireTime;
        // Schedule next fire
        nextInterval.nextFire = currentTime + nextInterval.ms;
        // Execute the callback
        nextInterval.fn();
      } else {
        // No more intervals to fire, jump to target
        currentTime = targetTime;
      }
    }

    // After reaching target time, fire any intervals that are exactly at targetTime
    // (handles the case where we jumped directly to target without an intermediate interval)
    let foundInterval = true;
    while (foundInterval) {
      foundInterval = false;
      for (const [, interval] of intervals) {
        if (interval.nextFire <= currentTime) {
          foundInterval = true;
          // Schedule next fire before executing (in case callback clears the interval)
          interval.nextFire = currentTime + interval.ms;
          interval.fn();
          break; // Restart the loop in case intervals changed
        }
      }
    }
  };

  return {
    get currentTime() {
      return currentTime;
    },
    now: () => currentTime,
    setInterval: (fn, ms) => {
      const id = nextId++ as unknown as ReturnType<typeof setInterval>;
      intervals.set(id, { fn, ms, nextFire: currentTime + ms });
      return id;
    },
    clearInterval: (id) => {
      intervals.delete(id);
    },
    tick,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("createTimer", () => {
  let timer: Timer;
  let clock: FakeClock;
  let ticks: number[];
  let expireCalled: boolean;

  beforeEach(() => {
    clock = createFakeClock();
    ticks = [];
    expireCalled = false;
    timer = createTimer(
      {
        onTick: (remaining) => ticks.push(remaining),
        onExpire: () => {
          expireCalled = true;
        },
      },
      clock,
    );
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

    it("should call onTick after 1 second with decremented value", () => {
      timer.start(3000);
      expect(ticks).toEqual([3000]);

      clock.tick(1000);
      expect(ticks).toEqual([3000, 2000]);
    });

    it("should call onExpire when timer reaches 0", () => {
      timer.start(2000);
      expect(expireCalled).toBe(false);

      clock.tick(2000);
      expect(expireCalled).toBe(true);
      expect(ticks).toContain(0);
    });

    it("should stop running after expiry", () => {
      timer.start(1000);
      clock.tick(1000);

      expect(timer.isRunning()).toBe(false);
      expect(timer.getRemaining()).toBe(0);
    });

    it("should reset if started while already running", () => {
      timer.start(5000);
      clock.tick(1000);

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

    it("should stop the interval (no more ticks)", () => {
      timer.start(5000);
      timer.stop();
      const tickCount = ticks.length;

      clock.tick(1000);
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

    it("should stop ticks while paused", () => {
      timer.start(5000);
      timer.pause();
      const remaining = timer.getRemaining();

      clock.tick(1000);
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

    it("should resume ticking", () => {
      timer.start(5000);
      timer.pause();
      const ticksBefore = ticks.length;

      timer.resume();
      clock.tick(1000);

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
    it("should count down correctly over multiple seconds", () => {
      timer.start(4000);
      clock.tick(3000);

      // Should have ticked: 4000, 3000, 2000, 1000
      expect(ticks).toEqual([4000, 3000, 2000, 1000]);
      expect(timer.getRemaining()).toBe(1000);
    });

    it("should not go below 0", () => {
      timer.start(2000);
      clock.tick(3000);

      // All tick values should be >= 0
      expect(ticks.every((t) => t >= 0)).toBe(true);
      expect(timer.getRemaining()).toBe(0);
    });
  });

  describe("totalPausedMs tracking", () => {
    it("should start with 0 total paused time", () => {
      timer.start(5000);
      expect(timer.getTotalPausedMs()).toBe(0);
    });

    it("should track time spent paused", () => {
      timer.start(5000);
      timer.pause();
      clock.tick(500);
      timer.resume();

      // Should have tracked exactly 500ms of pause time
      expect(timer.getTotalPausedMs()).toBe(500);
    });

    it("should accumulate multiple pause durations", () => {
      timer.start(10000);

      // First pause
      timer.pause();
      clock.tick(300);
      timer.resume();

      // Second pause
      timer.pause();
      clock.tick(300);
      timer.resume();

      // Should have accumulated exactly 600ms
      expect(timer.getTotalPausedMs()).toBe(600);
    });

    it("should include current pause duration when queried while paused", () => {
      timer.start(5000);
      timer.pause();
      clock.tick(300);

      // While still paused, getTotalPausedMs should include current pause
      expect(timer.getTotalPausedMs()).toBe(300);
    });

    it("should reset total paused time on start", () => {
      timer.start(5000);
      timer.pause();
      clock.tick(300);
      timer.resume();

      expect(timer.getTotalPausedMs()).toBeGreaterThan(0);

      // Start again should reset
      timer.start(5000);
      expect(timer.getTotalPausedMs()).toBe(0);
    });

    it("should preserve total paused time after stop", () => {
      timer.start(5000);
      timer.pause();
      clock.tick(300);
      timer.resume();

      const pausedBefore = timer.getTotalPausedMs();
      timer.stop();

      // Total paused time should still be accessible
      expect(timer.getTotalPausedMs()).toBe(pausedBefore);
    });

    it("resetTotalPausedMs should clear accumulated time", () => {
      timer.start(5000);
      timer.pause();
      clock.tick(300);
      timer.resume();

      expect(timer.getTotalPausedMs()).toBeGreaterThan(0);

      timer.resetTotalPausedMs();
      expect(timer.getTotalPausedMs()).toBe(0);
    });
  });
});
