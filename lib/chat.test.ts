import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SYSTEM_PROMPT, demoReply, extractProposal, needsCareBoundary } from "./chat";

describe("conseiller constraints", () => {
  it("locks the system prompt to Kreyòl, balance, and no diagnosis", () => {
    assert.match(SYSTEM_PROMPT, /Kreyòl/);
    assert.match(SYSTEM_PROMPT, /Pa janm fè dyagnostik/);
    assert.match(SYSTEM_PROMPT, /konfime/i);
    assert.match(SYSTEM_PROMPT, /Travay, Lavi, Sante, ak Dòmi/);
  });

  it("refuses diagnosis in demo mode", () => {
    const reply = demoReply("Fè yon dyagnostik, mwen gen depresyon", "ht");
    assert.match(reply.text, /pwofesyonèl/);
    assert.equal(reply.proposal, null);
    assert.equal(needsCareBoundary("please diagnose my anxiety"), true);
  });

  it("proposes a log the user can confirm", () => {
    const reply = demoReply("Mwen travay 3 èdtan", "ht");
    assert.equal(reply.proposal?.category, "work");
    assert.equal(reply.proposal?.hours, 3);
    assert.match(reply.text, /Konfime/);
  });

  it("switches language when asked", () => {
    const reply = demoReply("in english please, I need advice", "ht");
    assert.equal(reply.locale, "en");
    assert.match(reply.text, /Balance/);
  });

  it("strips a proposal block from model text", () => {
    const extracted = extractProposal(
      'Mwen ka mete sa a.\n```json\n{"propose":{"category":"sleep","hours":7,"note":"dòmi"}}\n```',
    );
    assert.equal(extracted.proposal?.category, "sleep");
    assert.equal(extracted.proposal?.hours, 7);
    assert.equal(extracted.clean.includes("propose"), false);
  });
});
