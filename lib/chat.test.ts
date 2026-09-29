import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SYSTEM_PROMPT, demoReply, extractProposal, finalizeAssistantText, needsCareBoundary, systemPromptFor } from "./chat";

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

  it("answers a Kreyòl question instead of guessing a log", () => {
    const reply = demoReply("Kijan mwen ka kenbe balans travay ak dòmi jodi a?", "ht");
    assert.equal(reply.proposal, null);
    assert.match(reply.text, /Balans/);
    assert.equal(reply.locale, "ht");
  });

  it("answers a Kreyòl phrase in Kreyòl even if the account locale is English", () => {
    const reply = demoReply("Mwen travay 3 èdtan", "en");
    assert.equal(reply.locale, "ht");
    assert.match(reply.text, /Konfime|èdtan/);
  });

  it("rejects an English adviser reply when the session is Kreyòl", () => {
    const finalized = finalizeAssistantText(
      "I understood 3 hours of work. Confirm if you want this in the journal.",
      "Mwen travay 3 èdtan",
      "ht",
      false,
    );
    assert.equal(finalized.languageOk, false);
    assert.equal(finalized.locale, "ht");
  });

  it("keeps a Kreyòl reply and can hide the proposal when the log draft is already showing", () => {
    const finalized = finalizeAssistantText(
      'Mwen konprann 3 èdtan nan Travay.\n```json\n{"propose":{"category":"work","hours":3,"note":"travay"}}\n```',
      "Mwen travay 3 èdtan",
      "ht",
      true,
    );
    assert.equal(finalized.languageOk, true);
    assert.equal(finalized.proposal, null);
    assert.match(finalized.text, /èdtan/);
  });

  it("locks the spoken session prompt to Kreyòl", () => {
    assert.match(systemPromptFor("ht"), /Kreyòl ayisyen/);
    assert.match(systemPromptFor("ht"), /Pa reponn an angle/);
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
