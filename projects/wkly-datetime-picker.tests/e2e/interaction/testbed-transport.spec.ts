import { test, expect } from "../fixtures";

test("testbed navigation and bundles load with browser networking offline", async ({
  page,
  context,
  browserName,
  baseURL,
}, info) => {
  test.skip(browserName !== "chromium", "Chromium transport fault injection");
  await context.setOffline(true);
  await page.goto("/cases/empty/virtual-weeks");
  await expect(page).toHaveURL(`${baseURL}/cases/empty/virtual-weeks`);
  await expect(page.locator("[data-angular-version]")).toHaveAttribute(
    "data-angular-version",
    String(info.project.metadata.angular),
  );
  await expect(page.locator("wkly-datetime-picker")).toBeVisible();
});
