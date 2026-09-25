import { test, expect } from "./fixtures";

test("range and styling routes load their isolated calendars after navigation and reload", async ({
  page,
}) => {
  for (const route of ["ranges", "styling"]) {
    await page.goto(`/${route}`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.locator("iframe[data-runtime-version='11']").first(),
    ).toBeVisible();
  }
  await page.reload();
  await expect(
    page.locator("iframe[data-runtime-version='11']").first(),
  ).toBeVisible();
});

test("evergreen showcase configures the isolated Angular calendar", async ({
  page,
}) => {
  await page.goto("/single");
  await expect(
    page.getByRole("combobox", { name: "Angular runtime version" }),
  ).toHaveValue("11");
  const panel = page.getByTestId("datetime");
  const runtime = panel.frameLocator("iframe[data-runtime-version='11']");
  await expect(runtime.locator("wkly-datetime-picker")).toBeVisible();
  await expect(panel.getByTestId("value")).toContainText("2099-12-16");

  await panel.getByText("Configure this example").click();
  await panel.getByLabel("Selection mode").selectOption("date");
  await expect(runtime.locator("wkly-datetime-picker")).toBeVisible();
  await expect(panel.getByTestId("value")).toContainText("null");
  await panel.getByRole("button", { name: "Reset example" }).click();
  await expect(panel.getByTestId("value")).toContainText("2099-12-16");
});

test("showcase sends translations and receives calendar events", async ({
  page,
}) => {
  await page.goto("/localization");
  const arabic = page.getByTestId("arabic");
  const runtime = arabic.frameLocator("iframe[data-runtime-version='11']");
  await expect(runtime.locator("wkly-datetime-picker")).toBeVisible();
  await expect(runtime.getByRole("button", { name: "الآن" })).toBeVisible();
  await arabic.getByRole("button", { name: "Clear value" }).click();
  await expect(arabic.getByTestId("value")).toContainText("null");
  await expect
    .poll(() =>
      runtime
        .locator("wkly-datetime-picker")
        .evaluate(
          (element) =>
            (window as any).ng.probe(element).componentInstance.value,
        ),
    )
    .toBe(null);
  await runtime.getByRole("button", { name: "الآن" }).click();
  await expect(arabic.getByTestId("emissions")).toContainText("1 emissions");
});

test("dialog and CDK presentations stay inside their runtime", async ({
  page,
}) => {
  await page.goto("/presentations");
  const dialogPanel = page.getByTestId("dialog");
  const dialogFrame = dialogPanel.frameLocator("iframe");
  await dialogFrame.getByRole("button", { name: "Open dialog" }).click();
  const dialog = dialogFrame.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Minute", exact: true }).fill("15");
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialogPanel.getByTestId("value")).toContainText("13:15:00.000Z");
  await expect(dialogPanel.getByText("Last close: submit")).toBeVisible();

  const overlayPanel = page.getByTestId("overlay");
  const overlayFrame = overlayPanel.frameLocator("iframe");
  await overlayFrame
    .getByRole("textbox", { name: "Choose date and time" })
    .click();
  await expect(overlayFrame.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(overlayFrame.getByRole("dialog")).toHaveCount(0);
});

test("paired calendar examples synchronize through the host", async ({
  page,
}) => {
  await page.goto("/calendars");
  const gregorian = page.getByTestId("gregorian-pair");
  const hebrew = page.getByTestId("hebrew-pair");
  await expect(
    gregorian.frameLocator("iframe").locator("wkly-datetime-picker"),
  ).toBeVisible();
  await expect(
    hebrew.frameLocator("iframe").locator("wkly-datetime-picker"),
  ).toBeVisible();
  await page.getByRole("button", { name: /1969-12-31/ }).click();
  await expect(gregorian.getByTestId("value")).toContainText("1969-12-31");
  await expect(hebrew.getByTestId("value")).toContainText("1969-12-31");
});

test("validation and programmatic values cross the iframe boundary", async ({
  page,
}) => {
  await page.goto("/validation");
  const panel = page.getByTestId("constraints");
  await expect(
    panel.frameLocator("iframe").locator("wkly-datetime-picker"),
  ).toBeVisible();
  await panel.getByText("Configure this example").click();
  await panel.getByLabel("Programmatic UTC value").fill("invalid-date");
  await panel.getByRole("button", { name: "Apply value" }).click();
  await expect(panel.getByTestId("validation")).toContainText("malformed-iso");
  await panel
    .getByLabel("Programmatic UTC value")
    .fill("2099-11-30T13:00:00.000Z");
  await panel.getByRole("button", { name: "Apply value" }).click();
  await expect(panel.getByTestId("validation")).toContainText("below-minimum");
});

test("virtual jump controls reach the calendar runtime", async ({ page }) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  const runtime = panel.frameLocator("iframe");
  await expect(runtime.locator("wkly-datetime-picker")).toBeVisible();
  const before = await runtime
    .locator("wkly-datetime-picker")
    .evaluate(
      (element) => (window as any).ng.probe(element).componentInstance.focused,
    );
  await panel.getByRole("button", { name: "Jump before 1970" }).click();
  await expect
    .poll(() =>
      runtime
        .locator("wkly-datetime-picker")
        .evaluate(
          (element) =>
            (window as any).ng.probe(element).componentInstance.focused,
        ),
    )
    .not.toBe(before);
});
