import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isKreyolText, kreyolMarkerCount, speakableText, spellKreyolNumbers } from "./speech-text";

describe("kreyol speech text", () => {
  it("recognizes a Kreyòl log phrase", () => {
    assert.equal(isKreyolText("Mwen travay 3 èdtan"), true);
    assert.ok(kreyolMarkerCount("Mwen travay 3 èdtan") >= 2);
  });

  it("rejects an English adviser paragraph", () => {
    assert.equal(
      isKreyolText("I understood 3 hours of work. Confirm if you want this in the journal."),
      false,
    );
  });

  it("rejects a French adviser sentence", () => {
    assert.equal(isKreyolText("Je comprends 3 heures pour le travail. Confirme si tu veux l'ajouter."), false);
  });

  it("spells small numbers in Kreyòl before speech", () => {
    assert.equal(spellKreyolNumbers("Mwen konprann 3 èdtan"), "Mwen konprann twa èdtan");
    assert.equal(spellKreyolNumbers("Konfime 1.5 èdtan"), "Konfime yon ak demi èdtan");
    assert.equal(spellKreyolNumbers("Ane 2026"), "Ane 2026");
  });

  it("strips markdown before speaking", () => {
    assert.equal(speakableText("**Kenbe** ritm nan.\n```json\n{\"a\":1}\n```"), "Kenbe ritm nan.");
  });
});
