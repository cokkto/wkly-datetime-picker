import { test as base, expect, Page } from "@playwright/test";
import type { FixtureSpec, HostSnapshot, PublicInputs } from "../host/protocol";
import type { WklyPickerValue } from "wkly-datetime-picker.adapters";

export class PickerFixture {
  constructor(readonly page: Page) {}
  get picker() {
    return this.page.locator("wkly-datetime-picker");
  }
  snapshot() {
    return this.page.evaluate(() => window.wklyTestHost.snapshot());
  }
  inputs(inputs: PublicInputs) {
    return this.page.evaluate(
      (inputs) => window.wklyTestHost.setInputs(inputs),
      inputs,
    );
  }
  write(value: WklyPickerValue, via: "form" | "cva" = "form") {
    return this.page.evaluate(
      ({ value, via }) => window.wklyTestHost.writeValue(value, via),
      { value, via },
    );
  }
  disable(disabled: boolean) {
    return this.page.evaluate(
      (disabled) => window.wklyTestHost.setDisabled(disabled),
      disabled,
    );
  }
}
export const codes = (snapshot: HostSnapshot) =>
  snapshot.errors?.wkly.map((error) => error.code) || [];
export const emissions = (snapshot: HostSnapshot) =>
  snapshot.events
    .filter((event) => event.name === "valueChange")
    .map((event) => event.value);
type Entry = { page: Page; bootId: string; errors: string[] };
type Domain = { acquire(suite: string): Promise<Entry> };
export const test = base.extend<
  { suite: string; spec: FixtureSpec; suitePage: Entry; host: PickerFixture },
  { domain: Domain }
>({
  suite: ["values", { option: true }],
  spec: [{}, { option: true }],
  domain: [
    async ({ browser }, use, workerInfo) => {
      const { angular, domain, suites } = workerInfo.project.metadata as {
        angular: string;
        domain: string;
        suites: Record<
          string,
          { width: number; height: number; zoom?: number }
        >;
      };
      const context = await browser.newContext({
        baseURL: workerInfo.project.use.baseURL,
        timezoneId: workerInfo.project.use.timezoneId,
        hasTouch: workerInfo.project.use.hasTouch,
        isMobile: workerInfo.project.use.isMobile,
        deviceScaleFactor: workerInfo.project.use.deviceScaleFactor,
        reducedMotion: "reduce",
      });
      const pages = new Map<string, Entry>();
      try {
        await use({
          acquire: async (suite) => {
            if (!suites[suite])
              throw new Error(`Unknown ${domain} suite: ${suite}`);
            let entry = pages.get(suite);
            if (!entry) {
              const page = await context.newPage();
              const errors: string[] = [];
              page.on("pageerror", (error) => errors.push(error.message));
              page.on("console", (message) => {
                if (message.type() === "error") errors.push(message.text());
              });
              await page.setViewportSize({
                width: suites[suite].width,
                height: suites[suite].height,
              });
              const url = new URL("/index.html", workerInfo.project.use.baseURL)
                .href;
              const response = await page.goto(url);
              expect(
                response?.ok(),
                `Test host navigation failed: ${url} (HTTP ${response?.status()})`,
              ).toBe(true);
              await page.waitForFunction(() => !!window.wklyTestHost);
              await page.evaluate((zoom) => {
                document.body.style.setProperty("zoom", String(zoom));
              }, suites[suite].zoom || 1);
              const identity = await page.evaluate(() =>
                window.wklyTestHost.identity(),
              );
              expect(identity.angular).toBe(angular);
              entry = { page, errors, bootId: identity.bootId };
              pages.set(suite, entry);
            }
            return entry;
          },
        });
        for (const entry of pages.values())
          expect(entry.errors, "No late browser errors").toEqual([]);
      } finally {
        await context.close();
      }
    },
    { scope: "worker" },
  ],
  // Cold browser/Angular startup must not consume the scenario's action budget.
  suitePage: [
    async ({ domain, suite }, use) => {
      await use(await domain.acquire(suite));
    },
    { timeout: 60000 },
  ],
  host: async ({ suitePage, suite, spec }, use, info) => {
    const started = performance.now();
    const { page, bootId, errors } = suitePage;
    expect(errors).toEqual([]);
    const before = await page.evaluate(() => window.wklyTestHost.identity());
    expect(before.bootId).toBe(bootId);
    expect(before.mounts).toBe(before.destroys);
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      document.getElementById("focus-sentinel")!.focus();
    });
    try {
      const mounted = await page.evaluate(
        (spec) => window.wklyTestHost.mount(spec),
        spec,
      );
      expect(mounted.fixtureId).toBe(before.fixtureId + 1);
      await use(new PickerFixture(page));
    } finally {
      if (info.status !== info.expectedStatus) {
        await info
          .attach(`${suite}-failure`, {
            body: await page.screenshot(),
            contentType: "image/png",
          })
          .catch(() => {});
        await info
          .attach(`${suite}-state`, {
            body: JSON.stringify(
              await page
                .evaluate(() => window.wklyTestHost.snapshot())
                .catch(() => null),
            ),
            contentType: "application/json",
          })
          .catch(() => {});
      }
      const after = await page.evaluate(() => window.wklyTestHost.destroy());
      expect(after.bootId).toBe(bootId);
      expect(after.mounts).toBe(after.destroys);
      expect(errors, "No browser errors during the scenario").toEqual([]);
      await info.attach("domain-metrics", {
        contentType: "application/json",
        body: JSON.stringify({
          angular: info.project.metadata.angular,
          browser: info.project.metadata.browser,
          domain: info.project.metadata.domain,
          suite,
          worker: info.workerIndex,
          bootId,
          fixtureId: after.fixtureId,
          mounts: after.mounts,
          destroys: after.destroys,
          elapsedMs: performance.now() - started,
        }),
      });
    }
  },
});
export { expect };
