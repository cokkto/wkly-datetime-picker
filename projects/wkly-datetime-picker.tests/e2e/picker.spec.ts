import { test, expect } from "./fixtures";
test("every route supports direct navigation and reload without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of [
    "",
    "single",
    "ranges",
    "presentations",
    "localization",
    "calendars",
    "validation",
    "virtualization",
    "styling",
  ]) {
    await page.goto("/" + route);
    await expect(page.locator("h1")).toBeVisible();
    await page.reload();
    await expect(page.locator("h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("single modes normalize Now and host clear without duplicate emissions", async ({
  page,
}) => {
  await page.goto("/single");
  for (const [id, value] of [
    ["datetime", "2099-12-16T13:00:00.000Z"],
    ["date", "2099-12-16T00:00:00.000Z"],
    ["time", "0000-01-01T13:00:00.000Z"],
  ]) {
    const panel = page.getByTestId(id);
    await panel
      .getByRole("button", { name: "Clear value", exact: true })
      .click();
    await expect(panel.getByTestId("value")).toHaveText("null");
    await panel.getByRole("button", { name: "Now", exact: true }).click();
    await expect(panel.getByTestId("value")).toHaveText(JSON.stringify(value));
    await panel.getByRole("button", { name: "Now", exact: true }).click();
    await expect(panel.getByTestId("emissions")).toHaveText("1 emissions");
    await expect(
      panel.getByRole("button", { name: "Confirm", exact: true }),
    ).toHaveCount(0);
  }
});

test("Now leaves one selected day when another day is chosen", async ({
  page,
}) => {
  await page.goto("/single");
  for (const [id, value] of [
    ["datetime", "2099-12-17T13:00:00.000Z"],
    ["date", "2099-12-17T00:00:00.000Z"],
  ]) {
    const panel = page.getByTestId(id);
    await panel.getByRole("button", { name: "Now", exact: true }).click();
    await expect(panel.locator(".day.selected")).toHaveCount(1);
    await panel
      .getByRole("button", { name: "Thursday, 17 December 2099", exact: true })
      .click();
    await expect(panel.getByTestId("value")).toHaveText(JSON.stringify(value));
    await expect(panel.locator(".day.selected")).toHaveCount(1);
    await expect(
      panel.getByRole("button", {
        name: "Wednesday, 16 December 2099",
        exact: true,
      }),
    ).not.toHaveClass(/selected/);
    await expect(
      panel.getByRole("button", {
        name: "Thursday, 17 December 2099",
        exact: true,
      }),
    ).toHaveClass(/selected/);
  }
});
test("Configure toggles week numbers in inline and opened pickers", async ({
  page,
}) => {
  await page.goto("/presentations");
  for (const id of ["inline", "dialog", "overlay", "material"]) {
    const panel = page.getByTestId(id);
    await panel.getByText("Configure this example").click();
    const toggle = panel.getByLabel("Show week numbers");
    const open = async () => {
      if (id === "dialog")
        await panel.getByRole("button", { name: "Open dialog" }).click();
      else if (id === "overlay" || id === "material")
        await panel.locator(".trigger-demo input").click();
    };
    const close = async () => {
      if (id !== "inline") await page.keyboard.press("Escape");
    };
    const calendar = id === "inline" ? panel : page.getByRole("dialog");
    await open();
    await expect(calendar.locator(".week-number").first()).toBeVisible();
    await close();
    await toggle.uncheck();
    await open();
    await expect(calendar.locator(".week-number")).toHaveCount(0);
    await close();
    await panel.getByRole("button", { name: "Reset example" }).click();
    await expect(toggle).toBeChecked();
    await open();
    await expect(calendar.locator(".week-number").first()).toBeVisible();
    await close();
  }
});

test("ranges stay incomplete until second endpoint and reverse order", async ({
  page,
}) => {
  await page.goto("/ranges");
  const panel = page.getByTestId("date-range");
  await expect(panel.locator("fieldset")).toHaveCount(0);
  await panel.getByRole("button", { name: "Now", exact: true }).click();
  await panel
    .getByRole("button", { name: "Thursday, 17 December 2099", exact: true })
    .click();
  await expect(panel.getByTestId("validation")).toContainText("incomplete");
  await panel
    .getByRole("button", { name: "Tuesday, 15 December 2099", exact: true })
    .click();
  await expect(panel.getByTestId("value")).toHaveText(
    '["2099-12-15T00:00:00.000Z","2099-12-17T00:00:00.000Z"]',
  );
  for (const id of ["datetime-range", "time-range"]) {
    const p = page.getByTestId(id);
    await expect(p.locator("fieldset")).toHaveCount(2);
    await p.getByRole("button", { name: "Now", exact: true }).click();
    await expect(p.getByTestId("validation")).toHaveText("valid");
    await expect(
      p.getByRole("textbox", { name: "Hour", exact: true }),
    ).toHaveCount(2);
  }
});
test("February 31 is retained, validated on input and never committed", async ({
  page,
}) => {
  await page.goto("/validation");
  const panel = page.getByTestId("invalid-date");
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const month = panel.getByRole("textbox", { name: "Month", exact: true });
  await month.fill("2");
  await expect(panel.getByTestId("validation")).toContainText(
    "invalid-calendar-date",
  );
  await month.press("Enter");
  await expect(
    panel.getByRole("textbox", { name: "Day", exact: true }),
  ).toHaveValue("31");
  await expect(panel.getByTestId("value")).toHaveText(
    '"2100-01-31T00:00:00.000Z"',
  );
  const day = panel.getByRole("textbox", { name: "Day", exact: true });
  await day.fill("");
  await expect(panel.getByTestId("validation")).toContainText("incomplete");
  await day.fill("28");
  await day.press("Enter");
  await expect(panel.getByTestId("value")).toHaveText(
    '"2100-02-28T00:00:00.000Z"',
  );
});
test("dialog draft, confirm, cancellation and date-only autosubmit", async ({
  page,
}) => {
  await page.goto("/presentations");
  const panel = page.getByTestId("dialog");
  const trigger = panel.getByRole("button", { name: "Open dialog" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Minute", exact: true }).fill("15");
  await dialog
    .getByRole("textbox", { name: "Minute", exact: true })
    .press("Enter");
  await expect(panel.getByTestId("emissions")).toHaveText("0 emissions");
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(panel.getByTestId("value")).toContainText("13:15:00.000Z");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("textbox", { name: "Minute", exact: true }).fill("20");
  await dialog.getByRole("button", { name: "Close picker" }).click();
  await expect(panel.getByTestId("emissions")).toHaveText("1 emissions");
  await panel.getByText("Configure this example").click();
  await panel.getByLabel("Selection mode").selectOption("date");
  await trigger.click();
  await expect(
    dialog.getByRole("button", { name: "Confirm", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Now", exact: true }).click();
  await trigger.click();
  await dialog
    .getByRole("button", { name: "Thursday, 17 December 2099", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(panel.getByTestId("value")).toHaveText(
    '"2099-12-17T00:00:00.000Z"',
  );
});
test("CDK and Material overlays share submission and focus restoration", async ({
  page,
}) => {
  await page.goto("/presentations");
  for (const id of ["overlay", "material"]) {
    const panel = page.getByTestId(id);
    const input = panel.locator("input").last();
    await input.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Minute", exact: true })
      .fill("25");
    await dialog
      .getByRole("textbox", { name: "Minute", exact: true })
      .press("Enter");
    await expect(panel.getByTestId("emissions")).toHaveText("0 emissions");
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(panel.getByTestId("value")).toContainText("13:25:00.000Z");
    await expect(input).toBeFocused();
    await input.click();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  }
});
test("locale, RTL, AM/PM and Hebrew shared epoch identity", async ({
  page,
}) => {
  await page.goto("/localization");
  await expect(page.getByTestId("hebrew").locator(".wkly")).toHaveAttribute(
    "dir",
    "rtl",
  );
  await expect(page.getByTestId("arabic").locator(".wkly")).toHaveAttribute(
    "dir",
    "rtl",
  );
  const us = page.getByTestId("us");
  await expect(us.getByTestId("context")).toContainText("offset 3");
  await us.getByRole("button", { name: "AM", exact: true }).click();
  await expect(us.getByTestId("value")).toContainText("T01:00:00.000Z");
  await page.goto("/calendars");
  await page.getByRole("button", { name: /1969-12-31/ }).click();
  await expect(
    page.getByTestId("gregorian-pair").getByTestId("value"),
  ).toHaveText('"1969-12-31T00:00:00.000Z"');
  await expect(page.getByTestId("hebrew-pair").getByTestId("value")).toHaveText(
    '"1969-12-31T00:00:00.000Z"',
  );
});
test("direct jumps, long scrolling and keyboard navigation keep bounded DOM", async ({
  page,
}) => {
  await page.goto("/virtualization");
  const panel = page.getByTestId("virtual-weeks");
  await panel.getByRole("button", { name: "Jump before 1970" }).click();
  await expect(panel.getByTestId("viewport")).toContainText("-");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(panel.getByTestId("value")).toContainText("1969-12-17");
  for (let i = 0; i < 12; i++)
    await panel.locator(".week-scroll").evaluate((el) => {
      el.scrollTop += 10000;
      el.dispatchEvent(new Event("scroll"));
    });
  await expect(panel.locator(".week-row")).toHaveCount(10);
  await panel.getByRole("button", { name: "Jump to 2099" }).click();
  await expect(
    panel.getByRole("button", {
      name: "Wednesday, 16 December 2099",
      exact: true,
    }),
  ).toBeFocused();
});
test("320px layout stays usable with 44px calendar targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/single");
  const panel = page.getByTestId("datetime");
  await expect(panel.locator(".wkly")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  const box = await panel.locator(".day:visible").first().boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
});
test("intentional visual baselines", async ({ page }, info) => {
  test.skip(
    info.project.name !== "chromium" ||
      Number(process.versions.node.split(".")[0]) < 20,
  );
  await page.goto("/single");
  await expect(page.getByTestId("datetime")).toHaveScreenshot("inline.png", {
    animations: "disabled",
    caret: "hide",
  });
  await page.goto("/localization");
  await expect(page.getByTestId("arabic")).toHaveScreenshot("rtl.png", {
    animations: "disabled",
    caret: "hide",
  });
  await page.goto("/styling");
  await expect(page.getByTestId("custom-style")).toHaveScreenshot(
    "custom-color.png",
    { animations: "disabled", caret: "hide" },
  );
  await page.goto("/presentations");
  await page
    .getByTestId("dialog")
    .getByRole("button", { name: "Open dialog" })
    .click();
  await expect(page.getByRole("dialog")).toHaveScreenshot("dialog.png", {
    animations: "disabled",
    caret: "hide",
  });
  await page.keyboard.press("Escape");
  for (const id of ["overlay", "material"]) {
    await page.getByTestId(id).locator("input").last().click();
    await expect(page.getByRole("dialog")).toHaveScreenshot(id + ".png", {
      animations: "disabled",
      caret: "hide",
    });
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize({ width: 320, height: 850 });
  await page.goto("/single");
  await expect(page.getByTestId("date")).toHaveScreenshot("mobile.png", {
    animations: "disabled",
    caret: "hide",
  });
});
