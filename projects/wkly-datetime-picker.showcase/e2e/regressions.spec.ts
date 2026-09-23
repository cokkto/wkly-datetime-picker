import { test, expect } from "./fixtures";

test("manual date edits follow the same calendar selection in both directions", async ({
  page,
}) => {
  await page.goto("/single");
  const panel = page.getByTestId("date");
  await panel.getByRole("button", { name: "Now", exact: true }).click();
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const year = panel.getByRole("textbox", { name: "Year", exact: true });
  await year.fill("2100");
  await year.press("Enter");
  const month = panel.getByRole("textbox", { name: "Month", exact: true });
  await month.fill("1");
  await month.press("Enter");
  const day = panel.getByRole("textbox", { name: "Day", exact: true });
  await day.fill("12");
  await day.press("Enter");
  await expect(panel.getByTestId("value")).toHaveText(
    '"2100-01-12T00:00:00.000Z"',
  );
  await panel.getByRole("button", { name: "Calendar view" }).click();
  await expect(
    panel.getByRole("button", {
      name: "Tuesday, 12 January 2100",
      exact: true,
    }),
  ).toHaveClass(/selected/);
  await panel
    .getByRole("button", { name: "Wednesday, 13 January 2100", exact: true })
    .click();
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  await expect(
    panel.getByRole("textbox", { name: "Day", exact: true }),
  ).toHaveValue("13");
});

test("invalid manual date retains its draft and opens the matching calendar month", async ({
  page,
}) => {
  await page.goto("/validation");
  const panel = page.getByTestId("invalid-date");
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const month = panel.getByRole("textbox", { name: "Month", exact: true });
  await month.fill("2");
  await month.press("Enter");
  await expect(panel.getByTestId("value")).toHaveText(
    '"2100-01-31T00:00:00.000Z"',
  );
  await panel.getByRole("button", { name: "Calendar view" }).click();
  await expect(panel.locator(".week-navigation")).toContainText(
    "February 2100",
  );
  await expect(panel.locator(".day.selected")).toHaveCount(0);
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const day = panel.getByRole("textbox", { name: "Day", exact: true });
  await expect(day).toHaveValue("31");
  await day.fill("28");
  await day.press("Enter");
  await panel.getByRole("button", { name: "Calendar view" }).click();
  await expect(
    panel.getByRole("button", {
      name: "Sunday, 28 February 2100",
      exact: true,
    }),
  ).toHaveClass(/selected/);
  await expect(panel.getByTestId("value")).toHaveText(
    '"2100-02-28T00:00:00.000Z"',
  );
});

test("manual range endpoints appear in the one shared calendar", async ({
  page,
}) => {
  await page.goto("/ranges");
  const panel = page.getByTestId("date-range");
  await panel.getByRole("button", { name: "Now", exact: true }).click();
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const fields = panel.locator("fieldset");
  const start = fields
    .nth(0)
    .getByRole("textbox", { name: "Day", exact: true });
  const end = fields.nth(1).getByRole("textbox", { name: "Day", exact: true });
  await start.fill("15");
  await start.press("Enter");
  await end.fill("18");
  await end.press("Enter");
  await expect(panel.getByTestId("value")).toHaveText(
    '["2099-12-15T00:00:00.000Z","2099-12-18T00:00:00.000Z"]',
  );
  await panel.getByRole("button", { name: "Calendar view" }).click();
  await expect(
    panel.getByRole("button", {
      name: "Tuesday, 15 December 2099",
      exact: true,
    }),
  ).toHaveClass(/selected/);
  await expect(
    panel.getByRole("button", {
      name: "Friday, 18 December 2099",
      exact: true,
    }),
  ).toHaveClass(/selected/);
  await expect(
    panel
      .getByRole("button", { name: "Wednesday, 16 December 2099", exact: true })
      .locator(".."),
  ).toHaveClass(/range/);
});

test("empty constrained range opens on selectable dates and shows one completion message", async ({
  page,
}) => {
  await page.goto("/validation");
  const panel = page.getByTestId("range-constraints");
  const thursday = panel.getByRole("button", {
    name: "Thursday, 17 December 2099",
    exact: true,
  });
  const friday = panel.getByRole("button", {
    name: "Friday, 18 December 2099",
    exact: true,
  });
  await expect(thursday).toBeVisible();
  await expect(thursday).toHaveAttribute("aria-disabled", "false");
  await expect(panel.getByTestId("validation")).toHaveText("incomplete");
  await thursday.click();
  await expect(panel.getByTestId("validation")).toHaveText("incomplete");
  await friday.click();
  await expect(panel.getByTestId("value")).toHaveText(
    '["2099-12-17T00:00:00.000Z","2099-12-18T00:00:00.000Z"]',
  );
  await expect(panel.getByTestId("validation")).toHaveText("valid");
});

test("programmatic validation, required, disabled and form touched state", async ({
  page,
}) => {
  await page.goto("/validation");
  const panel = page.getByTestId("constraints");
  await panel.getByRole("button", { name: "Clear value", exact: true }).click();
  await expect(panel.getByTestId("validation")).toContainText("incomplete");
  await panel.getByText("Configure this example").click();
  await panel
    .getByLabel("Programmatic UTC value")
    .fill("2099-12-16T13:00:00+03:00");
  await panel.getByRole("button", { name: "Apply value", exact: true }).click();
  await expect(panel.getByTestId("validation")).toContainText("malformed-iso");
  await expect(panel.getByTestId("emissions")).toHaveText("0 emissions");
  await panel
    .getByLabel("Programmatic UTC value")
    .fill("2099-11-01T13:00:00.000Z");
  await panel.getByRole("button", { name: "Apply value", exact: true }).click();
  await expect(panel.getByTestId("validation")).toContainText("below-minimum");
  await panel.getByRole("button", { name: "Now", exact: true }).click();
  await expect(panel.getByTestId("validation")).toHaveText("valid");
  await expect(panel.getByText(/Form: VALID · touched/)).toBeVisible();
  await panel.getByLabel("Disabled", { exact: true }).check();
  await expect(
    panel.getByRole("button", { name: "Now", exact: true }),
  ).toBeDisabled();
  await expect(
    panel.getByRole("textbox", { name: "Hour", exact: true }),
  ).toBeDisabled();
});

test("steps, invalid time, no carry, seconds and hour cycle switching", async ({
  page,
}) => {
  await page.goto("/single");
  const panel = page.getByTestId("datetime");
  await panel.getByText("Configure this example").click();
  await panel.getByLabel("Minute step").selectOption("5");
  const minute = panel.getByRole("textbox", { name: "Minute", exact: true });
  await minute.fill("13");
  await expect(panel.getByTestId("validation")).toContainText("step-mismatch");
  await minute.press("Enter");
  await expect(panel.getByTestId("emissions")).toHaveText("0 emissions");
  await minute.fill("55");
  await minute.press("Enter");
  await panel
    .getByRole("button", { name: "Minute: next", exact: true })
    .click();
  await expect(panel.getByTestId("value")).toContainText("T13:00:00.000Z");
  const hour = panel.getByRole("textbox", { name: "Hour", exact: true });
  await hour.fill("24");
  await expect(panel.getByTestId("validation")).toContainText("invalid-time");
  await hour.press("Escape");
  await expect(hour).toHaveValue("13");
  await panel.getByRole("button", { name: "AM", exact: true }).click();
  await expect(panel.getByTestId("value")).toContainText("T01:00:00.000Z");
  await panel.getByRole("button", { name: "24", exact: true }).click();
  await expect(hour).toHaveValue("01");
  await panel.getByLabel("Show seconds").check();
  const second = panel.getByRole("textbox", { name: "Second", exact: true });
  await second.fill("42");
  await second.press("Enter");
  await expect(panel.getByTestId("value")).toContainText("T01:00:42.000Z");
});

test("disabled range crossing and month/year boundaries", async ({ page }) => {
  await page.goto("/validation");
  const panel = page.getByTestId("range-constraints");
  await panel.getByRole("button", { name: "Now", exact: true }).click();
  await panel
    .getByRole("button", { name: "Friday, 18 December 2099", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Monday, 21 December 2099", exact: true })
    .click();
  await expect(panel.getByTestId("validation")).toContainText(
    "range-crosses-disabled",
  );
  await panel.getByText("Configure this example").click();
  await panel.getByLabel("Allow disabled-range crossing").check();
  await panel
    .getByRole("button", { name: "Friday, 18 December 2099", exact: true })
    .click();
  await panel
    .getByRole("button", { name: "Monday, 21 December 2099", exact: true })
    .click();
  await expect(panel.getByTestId("value")).toHaveText(
    '["2099-12-18T00:00:00.000Z","2099-12-21T00:00:00.000Z"]',
  );
  await panel.getByRole("button", { name: "Clear value", exact: true }).click();
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const fields = panel.locator("fieldset");
  await fields
    .nth(0)
    .getByRole("textbox", { name: "Day", exact: true })
    .fill("31");
  await fields
    .nth(0)
    .getByRole("textbox", { name: "Day", exact: true })
    .press("Enter");
  await fields
    .nth(1)
    .getByRole("textbox", { name: "Year", exact: true })
    .fill("2100");
  await fields
    .nth(1)
    .getByRole("textbox", { name: "Month", exact: true })
    .fill("1");
  await fields
    .nth(1)
    .getByRole("textbox", { name: "Day", exact: true })
    .fill("1");
  await fields
    .nth(1)
    .getByRole("textbox", { name: "Day", exact: true })
    .press("Enter");
  await expect(panel.getByTestId("value")).toHaveText(
    '["2099-12-31T00:00:00.000Z","2100-01-01T00:00:00.000Z"]',
  );
});

test("every transient mode requires Confirm except date calendar", async ({
  page,
}) => {
  await page.goto("/presentations");
  const panel = page.getByTestId("dialog");
  await panel.getByText("Configure this example").click();
  for (const mode of [
    "datetime",
    "time",
    "datetime-range",
    "date-range",
    "time-range",
  ]) {
    await panel.getByLabel("Selection mode").selectOption(mode);
    await panel.getByRole("button", { name: "Open dialog" }).click();
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: "Confirm", exact: true }),
    ).toBeDisabled();
    await dialog.getByRole("button", { name: "Now", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await panel.getByRole("button", { name: "Open dialog" }).click();
    await expect(
      dialog.getByRole("button", { name: "Confirm", exact: true }),
    ).toBeEnabled();
    await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await panel.getByLabel("Selection mode").selectOption("date");
  await panel.getByRole("button", { name: "Open dialog" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Manual date entry" }).click();
  await expect(
    dialog.getByRole("button", { name: "Confirm", exact: true }),
  ).toBeDisabled();
  const day = dialog.getByRole("textbox", { name: "Day", exact: true });
  await day.fill("17");
  await day.press("Enter");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(panel.getByTestId("value")).toHaveText(
    '"2099-12-17T00:00:00.000Z"',
  );
});

test("focus trap, field Escape, cancellation and backdrop rollback", async ({
  page,
}) => {
  await page.goto("/presentations");
  const panel = page.getByTestId("dialog");
  const trigger = panel.getByRole("button", { name: "Open dialog" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  const minute = dialog.getByRole("textbox", { name: "Minute", exact: true });
  await minute.fill("99");
  await minute.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(minute).toHaveValue("00");
  await dialog.getByRole("button", { name: "Confirm", exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(panel.getByTestId("emissions")).toHaveText("0 emissions");
  await trigger.click();
  await page.mouse.click(1, 1);
  await expect(dialog).toHaveCount(0);
  await expect(panel.getByTestId("emissions")).toHaveText("0 emissions");
  const overlay = page.getByTestId("overlay");
  await overlay.locator("input").last().click();
  await page
    .locator(".cdk-overlay-backdrop")
    .click({ position: { x: 1, y: 1 } });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(overlay.getByTestId("emissions")).toHaveText("0 emissions");
});

test("RTL chronological keyboard order, localized numeric entry and Now", async ({
  page,
}) => {
  await page.goto("/localization");
  const panel = page.getByTestId("arabic");
  const selected = panel.locator(".day.selected");
  await selected.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(panel.getByTestId("value")).toContainText("2099-12-17");
  await panel.getByRole("textbox", { name: "الدقيقة", exact: true }).fill("٢٥");
  await panel
    .getByRole("textbox", { name: "الدقيقة", exact: true })
    .press("Enter");
  await expect(panel.getByTestId("value")).toContainText("13:25:00.000Z");
  await panel.getByRole("button", { name: "الآن", exact: true }).click();
  await expect(panel.getByTestId("value")).toHaveText(
    '"2099-12-16T13:00:00.000Z"',
  );
});

test("calendar wheel, time wheel settlement, touch fields, forced colors and reduced motion", async ({
  page,
}, info) => {
  await page.goto("/single");
  const panel = page.getByTestId("datetime");
  const before = await panel.getByTestId("viewport").textContent();
  await panel.locator(".week-scroll").hover();
  await page.mouse.wheel(0, 600);
  await expect(panel.getByTestId("viewport")).not.toHaveText(before!);
  if (info.project.name === "mobile") {
    const scroller = panel.locator(".week-scroll");
    await scroller.scrollIntoViewIfNeeded();
    const box = (await scroller.boundingBox())!;
    const prior = await panel.getByTestId("viewport").textContent();
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width / 2,
      y = box.y + box.height * 0.8;
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 6; i++)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - i * 24 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(panel.getByTestId("viewport")).not.toHaveText(prior!);
    await session.detach();
  }
  const minute = panel.getByRole("textbox", { name: "Minute", exact: true });
  await minute.hover();
  await page.mouse.wheel(0, 60);
  await expect(panel.getByTestId("value")).toContainText("13:01:00.000Z");
  await panel
    .locator("wkly-field")
    .nth(1)
    .locator(".field")
    .evaluate((el) => {
      const start = new Event("touchstart", { bubbles: true });
      Object.defineProperty(start, "touches", { value: [{ clientY: 150 }] });
      el.dispatchEvent(start);
      const end = new Event("touchend", { bubbles: true });
      Object.defineProperty(end, "changedTouches", {
        value: [{ clientY: 110 }],
      });
      el.dispatchEvent(end);
    });
  await expect(panel.getByTestId("value")).toContainText("13:02:00.000Z");
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await expect(
    panel.getByRole("button", { name: "Now", exact: true }),
  ).toBeVisible();
});

test("manual fields retain trailing digits and submit after typing pauses", async ({
  page,
}) => {
  await page.goto("/single");
  const panel = page.getByTestId("datetime");
  await panel.getByText("Configure this example").click();
  await panel.getByLabel("Show seconds").check();
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const day = panel.getByRole("textbox", { name: "Day", exact: true });
  await day.fill("");
  await day.press("1");
  await expect(day).toHaveValue("1");
  await day.press("2");
  await expect(day).toHaveValue("12");
  await day.press("3");
  await expect(day).toHaveValue("23");
  await expect(panel.getByTestId("value")).toContainText("2099-12-16");
  await expect(panel.getByTestId("value")).toContainText("2099-12-23");
  await expect(day).toBeFocused();

  for (let [label, value, expected] of [
    ["Year", "2100", "2100-12-23"],
    ["Month", "12", "2100-12-23"],
    ["Hour", "14", "T14:00:00"],
    ["Minute", "25", "T14:25:00"],
    ["Second", "42", "T14:25:42"],
  ]) {
    const input = panel.getByRole("textbox", { name: label, exact: true });
    if (label === "Month") {
      await input.fill("1");
      await page.waitForTimeout(600);
      await input.press("2");
      await expect(input).toHaveValue("12");
      await page.waitForTimeout(600);
      await expect(panel.getByTestId("value")).toContainText("2100-12-23");
      await input.fill("11");
      expected = "2100-11-23";
    } else await input.fill(value);
    await expect(panel.getByTestId("value")).toContainText(expected);
    await expect(input).toBeFocused();
  }
  const minute = panel.getByRole("textbox", { name: "Minute", exact: true });
  await minute.fill("26");
  await minute.press("Tab");
  await expect(panel.getByTestId("value")).toContainText("T14:26:42");
});

test("month resolves numbers after a pause and unique name fragments immediately", async ({
  page,
}) => {
  await page.goto("/single");
  const panel = page.getByTestId("date");
  await panel.getByRole("button", { name: "Manual date entry" }).click();
  const month = panel.getByRole("textbox", { name: "Month", exact: true });
  await month.fill("11");
  await expect(month).toHaveValue("11");
  await expect(month).toHaveValue("November");
  await expect(panel.getByTestId("value")).toContainText("2099-11-16");

  await month.fill("emb");
  await expect(panel.getByTestId("value")).toContainText("2099-11-16");
  await month.fill("Dec");
  await expect(panel.getByTestId("value")).toContainText("2099-12-16", {
    timeout: 700,
  });
  await expect(month).toHaveValue("December");
});
