import { strict as assert } from "assert";
export { assert };
let passed = 0;
let failed = 0;
export function test(name: string, action: () => void): void {
  try {
    action();
    passed++;
    console.log("PASS " + name);
  } catch (error) {
    failed++;
    console.error("FAIL " + name, error);
    process.exitCode = 1;
  }
}
process.on("exit", () =>
  console.log(`${passed} passed; ${failed} failed; TZ=${process.env.TZ}`),
);
