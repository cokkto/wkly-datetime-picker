import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import supported from "../../../supported-angular.json";

for (const major of Object.keys(supported)) {
  test.describe(`Angular ${major} showcase`, () => {
    async function openRoute(page: Page, route: string): Promise<void> {
      await page.goto(route);
      await page
        .getByRole("combobox", { name: "Angular runtime version" })
        .selectOption(major);
    }

    test("range and styling routes load their isolated calendars after navigation and reload", async ({
      page,
    }) => {
      for (const route of ["ranges", "styling"]) {
        await openRoute(page, `/${route}`);
        await expect(page.locator("h1")).toBeVisible();
        await expect(
          page.locator(`iframe[data-runtime-version='${major}']`).first(),
        ).toBeVisible();
      }
      await page.reload();
      await page
        .getByRole("combobox", { name: "Angular runtime version" })
        .selectOption(major);
      await expect(
        page.locator(`iframe[data-runtime-version='${major}']`).first(),
      ).toBeVisible();
    });

    test("evergreen showcase configures the isolated Angular calendar", async ({
      page,
    }) => {
      await openRoute(page, "/single");
      await expect(
        page.getByRole("combobox", { name: "Angular runtime version" }),
      ).toHaveValue(major);
      const panel = page.getByTestId("datetime");
      const runtime = panel.frameLocator(
        `iframe[data-runtime-version='${major}']`,
      );
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
      await openRoute(page, "/localization");
      const arabic = page.getByTestId("arabic");
      const runtime = arabic.frameLocator(
        `iframe[data-runtime-version='${major}']`,
      );
      await expect(runtime.locator("wkly-datetime-picker")).toBeVisible();
      await expect(runtime.getByRole("button", { name: "الآن" })).toBeVisible();
      await arabic.getByRole("button", { name: "Clear value" }).click();
      await expect(arabic.getByTestId("value")).toContainText("null");
      await expect(runtime.locator("button.day.selected")).toHaveCount(0);
      await runtime.getByRole("button", { name: "الآن" }).click();
      await expect(arabic.getByTestId("emissions")).toContainText(
        "1 emissions",
      );
    });

    test("dialog and CDK presentations stay inside their runtime", async ({
      page,
    }) => {
      await openRoute(page, "/presentations");
      const dialogPanel = page.getByTestId("dialog");
      const dialogFrame = dialogPanel.frameLocator("iframe");
      await dialogFrame.getByRole("button", { name: "Open dialog" }).click();
      const dialog = dialogFrame.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("textbox", { name: "Minute", exact: true })
        .fill("15");
      await dialog.getByRole("button", { name: "Confirm" }).click();
      await expect(dialogPanel.getByTestId("value")).toContainText(
        "13:15:00.000Z",
      );
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
      await openRoute(page, "/calendars");
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
      await openRoute(page, "/validation");
      const panel = page.getByTestId("constraints");
      await expect(
        panel.frameLocator("iframe").locator("wkly-datetime-picker"),
      ).toBeVisible();
      await panel.getByText("Configure this example").click();
      await panel.getByLabel("Programmatic UTC value").fill("invalid-date");
      await panel.getByRole("button", { name: "Apply value" }).click();
      await expect(panel.getByTestId("validation")).toContainText(
        "malformed-iso",
      );
      await panel
        .getByLabel("Programmatic UTC value")
        .fill("2099-11-30T13:00:00.000Z");
      await panel.getByRole("button", { name: "Apply value" }).click();
      await expect(panel.getByTestId("validation")).toContainText(
        "below-minimum",
      );
    });

    test("virtual jump controls reach the calendar runtime", async ({
      page,
    }) => {
      await openRoute(page, "/virtualization");
      const panel = page.getByTestId("virtual-weeks");
      const runtime = panel.frameLocator("iframe");
      await expect(runtime.locator("wkly-datetime-picker")).toBeVisible();
      const before = await runtime.locator(".year-control").innerText();
      await panel.getByRole("button", { name: "Jump before 1970" }).click();
      await expect(runtime.locator(".year-control")).not.toHaveText(before);
    });
  });
}
