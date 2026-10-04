const api: typeof import("@playwright/test") = require("../../../scripts/playwright-api.cjs");
const base = api.test,
  expect = api.expect;
export { expect };
export const test = base.extend<{ browserErrors: void }>({
  context: async ({ context, baseURL, browserName }, use) => {
    if (browserName === "chromium" && baseURL) {
      const server = new URL(baseURL);
      const domain = server.hostname.replace(/^v\d+\./, "");
      // Keep real HTTP responses and browser origins while avoiding Chromium's
      // intermittent Windows socket-buffer failures for local testbed resources.
      await context.route(
        (url) =>
          url.protocol === "http:" &&
          url.port === server.port &&
          (url.hostname.replace(/^v\d+\./, "") === domain ||
            ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)),
        async (route) => {
          const request = route.request();
          if (!["GET", "HEAD"].includes(request.method()))
            return route.fallback();
          const original = new URL(request.url());
          const loopback = new URL(original);
          loopback.hostname = "127.0.0.1";
          const response = await context.request.fetch(loopback.href, {
            method: request.method(),
            headers: { ...request.headers(), host: original.host },
            maxRedirects: 0,
          });
          try {
            await route.fulfill({ response });
          } finally {
            // Large bundles must not accumulate in the API response cache.
            await response.dispose();
          }
        },
      );
    }
    await use(context);
  },
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
