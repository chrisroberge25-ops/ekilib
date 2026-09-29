import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseUtterance } from "./parser";

describe("parseUtterance", () => {
  it("reads a Kreyòl work log", () => {
    const parsed = parseUtterance("Mwen travay 3 èdtan");
    assert.equal(parsed.category, "work");
    assert.equal(parsed.hours, 3);
    assert.equal(parsed.confidence, "high");
  });

  it("reads sport without a duration", () => {
    const parsed = parseUtterance("Mwen fè espò");
    assert.equal(parsed.category, "health");
    assert.equal(parsed.hours, null);
    assert.equal(parsed.confidence, "low");
  });

  it("reads sleep with a decimal hour", () => {
    const parsed = parseUtterance("mwen dòmi 7.5 èdtan");
    assert.equal(parsed.category, "sleep");
    assert.equal(parsed.hours, 7.5);
  });

  it("reads English and French", () => {
    assert.equal(parseUtterance("I worked 2 hours").category, "work");
    assert.equal(parseUtterance("I worked 2 hours").hours, 2);
    const sport = parseUtterance("j'ai fait du sport pendant 45 minutes");
    assert.equal(sport.category, "health");
    assert.equal(sport.hours, 0.75);
  });

  it("reads family time with è as the hour word", () => {
    const parsed = parseUtterance("Mwen pase 2 è ak fanmi mwen");
    assert.equal(parsed.category, "life");
    assert.equal(parsed.hours, 2);
  });

  it("reads a compact duration and a one-hour spelling", () => {
    assert.equal(parseUtterance("3h travay").hours, 3);
    assert.equal(parseUtterance("3h travay").category, "work");
    assert.equal(parseUtterance("Mwen dòmi inèdtan").hours, 1);
    assert.equal(parseUtterance("Mwen dòmi inèdtan").category, "sleep");
  });

  it("returns an empty parse for blank text", () => {
    const parsed = parseUtterance("   ");
    assert.equal(parsed.category, null);
    assert.equal(parsed.hours, null);
  });
});
