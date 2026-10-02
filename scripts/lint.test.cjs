const assert = require("node:assert/strict");
const test = require("node:test");
const { lintScript, lintTemplate, toolchain } = require("./lint.cjs");

test("Angular templates use their own major's grammar", async () => {
  const old = await toolchain("11");
  const current = await toolchain("22");
  const controlFlow = "@if (ready) { <p>Ready</p> }";
  assert.ok(
    lintTemplate("fixture.component.html", old.compiler, controlFlow) > 0,
  );
  assert.equal(
    lintTemplate("fixture.component.html", current.compiler, controlFlow),
    0,
  );
  const inline = `@Component({ template: \`${controlFlow}\` }) class Example {}`;
  assert.ok(lintScript("fixture.ts", old.ts, inline, old.compiler) > 0);
  assert.equal(
    lintScript("fixture.ts", current.ts, inline, current.compiler),
    0,
  );
});

test("script lint reports syntax errors and code rules", async () => {
  const { ts } = await toolchain("11");
  assert.ok(lintScript("fixture.ts", ts, "const value = ;") > 0);
  assert.equal(
    lintScript("fixture.ts", ts, "var value = 1; debugger; eval(value);"),
    3,
  );
});
