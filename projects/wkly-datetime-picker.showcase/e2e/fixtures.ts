const api: typeof import("@playwright/test") = require("../../../scripts/playwright-api.cjs");
const base = api.test,
  expect = api.expect;
export { expect };
export const test = base.extend<{ browserErrors: void }>({
  browserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use();
      expect(errors, "No uncaught browser or Angular errors").toEqual([]);
    },
    { auto: true },
  ],
});
