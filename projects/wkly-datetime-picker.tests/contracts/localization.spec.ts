import { strict as assert } from "node:assert";
import { test } from "./test";
import { resolveWklyTranslation } from "wkly-datetime-picker";

test("translation lookup resolves regional, script, language and English entries per key", () => {
  const catalog = {
    "EN-gb": { now: "Regional now" },
    en: { now: "Language now", confirm: "Language confirm" },
    "he-IL": { now: "Regional Hebrew" },
    he: { confirm: "Hebrew confirm" },
    "zh-Hant": { now: "Script now" },
    zh: { confirm: "Language Chinese" },
  };
  assert.equal(resolveWklyTranslation("now", "en-GB", catalog), "Regional now");
  assert.equal(
    resolveWklyTranslation("confirm", "en-GB", catalog),
    "Language confirm",
  );
  assert.equal(resolveWklyTranslation("now", "en-US", catalog), "Language now");
  assert.equal(
    resolveWklyTranslation("now", "he-IL", catalog),
    "Regional Hebrew",
  );
  assert.equal(
    resolveWklyTranslation("confirm", "he-IL", catalog),
    "Hebrew confirm",
  );
  assert.equal(
    resolveWklyTranslation("now", "zh-Hant-TW", catalog),
    "Script now",
  );
  assert.equal(
    resolveWklyTranslation("confirm", "zh-Hant-TW", catalog),
    "Language Chinese",
  );
  assert.equal(resolveWklyTranslation("now", "fi-FI", catalog), "Now");
  assert.equal(resolveWklyTranslation("unknown", "fi-FI", catalog), "unknown");
  assert.equal(
    resolveWklyTranslation("now", "en-GB", catalog, { now: "Override" }),
    "Override",
  );
  assert.equal(resolveWklyTranslation("now", "en-GB", {}), "Now");
});
