import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { balanceScore, pickInsight, untrackedHours } from "./balance";
import { emptyHours } from "./categories";

const goals = { work: 8, life: 4, health: 2, sleep: 8 };

describe("balance", () => {
  it("scores a matching day at 100", () => {
    assert.equal(balanceScore(goals, goals), 100);
  });

  it("scores an empty day at 0", () => {
    assert.equal(balanceScore(emptyHours(), goals), 0);
  });

  it("computes untracked time for past, today, and future", () => {
    assert.equal(untrackedHours({ tracked: 10, date: "2026-09-01", today: "2026-09-02", nowHours: 15 }), 14);
    assert.equal(untrackedHours({ tracked: 6, date: "2026-09-02", today: "2026-09-02", nowHours: 9.5 }), 3.5);
    assert.equal(untrackedHours({ tracked: 0, date: "2026-09-03", today: "2026-09-02", nowHours: 9 }), 0);
  });

  it("does not return negative untracked hours", () => {
    assert.equal(untrackedHours({ tracked: 20, date: "2026-09-02", today: "2026-09-02", nowHours: 9 }), 0);
  });

  it("picks a health insight when the week has almost no movement", () => {
    const week = { work: 20, life: 6, health: 0, sleep: 20 };
    assert.equal(
      pickInsight({ today: { work: 4, life: 1, health: 0, sleep: 4 }, week, goals, score: 70 }),
      "noHealth",
    );
  });
});
