import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { audioMeta, selectSttProvider, sttLanguage } from "./stt";

describe("kreyol speech-to-text", () => {
  it("maps the account language onto a Whisper language code", () => {
    assert.equal(sttLanguage("ht"), "ht");
    assert.equal(sttLanguage("fr"), "fr");
    assert.equal(sttLanguage("en"), "en");
  });

  it("prefers the free Groq Whisper tier and falls back to OpenAI", () => {
    assert.equal(selectSttProvider({ GROQ_API_KEY: "g", OPENAI_API_KEY: "o" }), "groq");
    assert.equal(selectSttProvider({ OPENAI_API_KEY: "o" }), "openai");
    assert.equal(selectSttProvider({}), null);
    assert.equal(selectSttProvider({ STT_PROVIDER: "openai", GROQ_API_KEY: "g", OPENAI_API_KEY: "o" }), "openai");
    assert.equal(selectSttProvider({ STT_PROVIDER: "groq", OPENAI_API_KEY: "o" }), null);
  });

  it("names browser recordings so Whisper can read them", () => {
    assert.equal(audioMeta("audio/webm;codecs=opus").filename, "speech.webm");
    assert.equal(audioMeta("audio/mp4").filename, "speech.m4a");
    assert.equal(audioMeta("").filename, "speech.webm");
  });
});