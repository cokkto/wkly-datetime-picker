const { test, expect } = require("@playwright/test");
const supported = require("../../../supported-angular.json");
test("catalogue navigation, linked calendars and registered version links", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/single");
  await expect(
    page.getByTestId("datetime").locator("wkly-datetime-picker"),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/single$/);
  await expect(
    page.getByTestId("datetime").locator("wkly-datetime-picker"),
  ).toBeVisible();
  for (const major of Object.keys(supported))
    await expect(
      page.getByRole("link", {
        name: `Angular ${major} test cases`,
        exact: true,
      }),
    ).toHaveAttribute("href", new RegExp(`v${major}\\.wkly\\.localhost`));
  await page.locator('nav[aria-label="Showcase"] a[href="/calendars"]').click();
  await page.getByRole("button", { name: /1969-12-31/ }).click();
  for (const id of ["gregorian-pair", "hebrew-pair", "hijri-pair"])
    await expect(page.getByTestId(id).getByTestId("value")).toContainText(
      "1969-12-31",
    );
  await page.reload();
  await expect(page).toHaveURL(/\/calendars$/);
  await expect(
    page.getByTestId("hebrew-pair").locator("wkly-datetime-picker"),
  ).toBeVisible();
  const major = Object.keys(supported).sort((a, b) => Number(a) - Number(b))[0];
  const link = page.getByRole("link", {
    name: `Angular ${major} test cases`,
    exact: true,
  });
  const target = await link.getAttribute("href");
  await link.click();
  await expect(page).toHaveURL(new URL(target, page.url()).href);
  await expect(
    page.getByRole("heading", {
      name: `Angular ${major} testbed`,
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
