import { test, expect } from "../fixtures";
import { visibleDays } from "../helpers/picker";

for (const presentation of ["dialog", "overlay"])
  test(`${presentation}: immediate close cancels deferred jump focus`, async ({
    page,
  }) => {
    await page.goto(`/contracts?presentation=${presentation}`);
    await page
      .getByRole("button", { name: "Jump and immediately close", exact: true })
      .click();
    await expect(page.locator("wkly-datetime-picker")).toHaveCount(0);
    await expect(page.getByTestId("contract-value")).toHaveText("null");
    await expect(page.getByTestId("contract-emissions")).toHaveText("0");
    await page
      .getByRole("button", { name: "Jump value past", exact: true })
      .click();
    await expect(page.locator("button.day[data-day='-16']")).toBeFocused();
    await page.keyboard.press("Escape");
  });

for (const presentation of ["inline", "dialog", "overlay"])
  for (const calendar of ["gregorian", "hebrew", "hijri"])
    for (const method of ["week", "calendar", "value"])
      test(`${presentation} ${calendar}: public ${method} jumps focus pre-1970 and adapter boundaries`, async ({
        page,
      }) => {
        await page.goto(
          `/contracts?presentation=${presentation}&calendar=${calendar}`,
        );
        for (const boundary of ["past", "min", "max"]) {
          await page
            .getByRole("button", {
              name: `Jump ${method} ${boundary}`,
              exact: true,
            })
            .click();
          const picker = page.locator("wkly-datetime-picker");
          await expect(picker).toBeVisible();
          const min =
            calendar !== "gregorian"
              ? Date.UTC(1900, 0, 1) / 86400000
              : -719528;
          const max =
            calendar !== "gregorian"
              ? Date.UTC(2100, 11, 31) / 86400000
              : 2932896;
          const requested =
            boundary === "past" ? -16 : boundary === "min" ? min : max;
          const day =
            method === "week"
              ? Math.max(min, Math.floor((requested - 3) / 7) * 7 + 3)
              : requested;
          await expect(page.getByTestId("target-day")).toHaveText(String(day));
          const target = picker.locator(`button.day[data-day='${day}']`);
          await expect(target).toBeFocused();
          await expect
            .poll(() =>
              target.evaluate((element: HTMLElement) => {
                const box = element.getBoundingClientRect();
                const view = element
                  .closest(".week-scroll")!
                  .getBoundingClientRect();
                // Browser scroll offsets can differ by a fraction of a CSS pixel.
                return (
                  box.width > 0 &&
                  box.top >= view.top - 1 &&
                  box.bottom <= view.bottom + 1
                );
              }),
            )
            .toBe(true);
          await expect(page.getByTestId("contract-value")).toHaveText("null");
          await expect(page.getByTestId("contract-emissions")).toHaveText("0");
          await expect(page.getByTestId("contract-errors")).toHaveText("valid");
          if (presentation !== "inline") await page.keyboard.press("Escape");
        }
      });

test("application configuration and explicit inputs determine locale and week start", async ({
  page,
}) => {
  await page.goto("/contracts");
  const picker = page.locator("wkly-datetime-picker");
  const headers = picker.locator(".week-head [role='columnheader']");
  await expect(headers.nth(1)).toHaveText("Sun");
  await expect(
    picker.getByRole("button", { name: "Injected regional now", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => visibleDays(picker.locator(".week-scroll")))
    .toContain(-20);
  await page
    .getByRole("button", { name: "Explicit configuration", exact: true })
    .click();
  await expect(headers.nth(1)).toHaveText("Mon");
  await page
    .getByRole("button", { name: "Application configuration", exact: true })
    .click();
  await expect(headers.nth(1)).toHaveText("Sun");
  await page.getByRole("button", { name: "Write value", exact: true }).click();
  await expect(picker.locator("button.day.selected")).toHaveAttribute(
    "data-day",
    "47466",
  );
  await expect(page.getByTestId("contract-emissions")).toHaveText("0");
});

test("initial anchor precedence uses selection, explicit input, configuration and clock", async ({
  page,
}) => {
  for (const [query, expected] of [
    ["", -20],
    ["?initial=-16", -16],
    ["?initial=-16&value=2099-12-16T13:00:00.000Z", 47466],
    ["?defaults=locale", 47466],
  ] as const) {
    await page.goto(`/contracts${query}`);
    const picker = page.locator("wkly-datetime-picker");
    await expect
      .poll(() => visibleDays(picker.locator(".week-scroll")))
      .toContain(expected);
    await expect(
      picker.locator(`button.day[data-day='${expected}']`),
    ).toHaveAttribute("tabindex", "0");
    await expect(page.getByTestId("contract-emissions")).toHaveText("0");
  }
});

for (const presentation of ["dialog", "overlay"]) {
  test(`${presentation}: regional and language catalogs fall back per key and localization overrides win`, async ({
    page,
  }) => {
    await page.goto(`/contracts?presentation=${presentation}`);
    const open = async () => {
      if (presentation === "dialog")
        await page
          .getByRole("button", { name: "Open contract dialog", exact: true })
          .click();
      else
        await page
          .getByRole("textbox", { name: "Open contract overlay", exact: true })
          .click();
      return page.locator("wkly-datetime-picker");
    };
    let picker = await open();
    await expect(
      picker.getByRole("button", {
        name: "Injected regional now",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      picker.getByRole("button", { name: "Injected next", exact: true }),
    ).toBeVisible();
    await expect(
      picker.getByRole("button", { name: "Local confirm", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Input catalog", exact: true })
      .click();
    for (const [locale, now, next] of [
      ["British", "Regional now", "Language next"],
      ["US", "Language now", "Language next"],
      ["Hebrew", "Regional Hebrew now", "Hebrew next"],
      ["Hebrew language", "Now", "Hebrew next"],
      ["Finnish", "Now", "Next week"],
    ]) {
      await page
        .getByRole("button", { name: `${locale} locale`, exact: true })
        .click();
      picker = await open();
      await expect(
        picker.getByRole("button", { name: now, exact: true }),
      ).toBeVisible();
      await expect(
        picker.getByRole("button", { name: next, exact: true }),
      ).toBeVisible();
      await expect(
        picker.getByRole("button", { name: "Local confirm", exact: true }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "US locale", exact: true }).click();
    await page
      .getByRole("button", { name: "Empty catalog", exact: true })
      .click();
    picker = await open();
    await expect(
      picker.getByRole("button", { name: "Now", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Injected catalog", exact: true })
      .click();
    picker = await open();
    await expect(
      picker.getByRole("button", {
        name: "Injected regional now",
        exact: true,
      }),
    ).toBeVisible();
  });
}

test("runtime locale, step, bounds and disabled changes preserve values and usable focus", async ({
  page,
}) => {
  await page.goto("/contracts");
  const picker = page.locator("wkly-datetime-picker");
  await page.getByRole("button", { name: "Write value", exact: true }).click();
  await page
    .getByRole("button", { name: "British locale", exact: true })
    .click();
  await expect(picker.locator("button.day.selected")).toHaveAttribute(
    "data-day",
    "47466",
  );
  await expect(
    picker.getByRole("textbox", { name: "Hour", exact: true }),
  ).toHaveValue("13");
  const minute = picker.getByRole("textbox", { name: "Minute", exact: true });
  await minute.fill("1");
  await minute.press("Enter");
  await expect(page.getByTestId("contract-value")).toHaveText(
    JSON.stringify("2099-12-16T13:01:00.000Z"),
  );
  await page.getByRole("button", { name: "Step 15", exact: true }).click();
  await expect(page.getByTestId("contract-errors")).toHaveText("step-mismatch");
  await minute.fill("15");
  await minute.press("Enter");
  await page
    .getByRole("button", { name: "Future minimum", exact: true })
    .click();
  await expect(page.getByTestId("contract-errors")).toContainText(
    "below-minimum",
  );
  await page
    .getByRole("button", { name: "Clear minimum", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Toggle disabled", exact: true })
    .click();
  await expect(minute).toBeDisabled();
  await page
    .getByRole("button", { name: "Toggle disabled", exact: true })
    .click();
  await expect(minute).toBeEnabled();
  await minute.focus();
  await expect(minute).toBeFocused();
});

test("grid names, current and disabled states and range endpoint edits are observable", async ({
  page,
}) => {
  await page.goto("/contracts");
  await page.getByRole("button", { name: "Write value", exact: true }).click();
  const picker = page.locator("wkly-datetime-picker");
  const grid = picker.getByRole("grid", {
    name: "Contract calendar",
    exact: true,
  });
  await expect(grid).toHaveAttribute("aria-multiselectable", "false");
  await expect(picker.locator("section.wkly")).toHaveAttribute(
    "aria-describedby",
    "contract-description",
  );
  const today = picker.locator("button.day[data-day='47466']");
  await expect(today).toHaveAttribute("aria-current", "date");
  await expect(today).toHaveAttribute("aria-disabled", "false");
  await expect(today).toHaveAttribute(
    "aria-label",
    "Wednesday, 16 December 2099",
  );
  const before = await page.getByTestId("contract-value").textContent();
  const disabled = picker.locator("button.day[data-day='47467']");
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await disabled.click({ force: true });
  await expect(page.getByTestId("contract-value")).toHaveText(before!);
  await page.getByRole("button", { name: "Range mode", exact: true }).click();
  await page
    .getByRole("button", { name: "Jump value max", exact: true })
    .click();
  // Re-anchor on the fixed clock date before choosing endpoints.
  await picker
    .getByRole("button", { name: "Injected regional now", exact: true })
    .click();
  const days = await visibleDays(picker.locator(".week-scroll"));
  const a = picker.locator(`button.day[data-day='${days[8]}']`);
  const b = picker.locator(`button.day[data-day='${days[10]}']`);
  await a.click();
  await b.click();
  await expect(grid).toHaveAttribute("aria-multiselectable", "true");
  await expect(a.locator("..")).toHaveAttribute("aria-selected", "true");
  await expect(b.locator("..")).toHaveAttribute("aria-selected", "true");
  const start = picker
    .getByRole("group", { name: "Start", exact: true })
    .getByRole("textbox", { name: "Minute", exact: true });
  const end = picker
    .getByRole("group", { name: "End", exact: true })
    .getByRole("textbox", { name: "Minute", exact: true });
  await start.fill("15");
  await start.press("Enter");
  await end.fill("30");
  await end.press("Enter");
  const iso = (day: number, minute: string) =>
    `${new Date(day * 86400000).toISOString().slice(0, 10)}T13:${minute}:00.000Z`;
  await expect(page.getByTestId("contract-value")).toHaveText(
    JSON.stringify([iso(days[8], "15"), iso(days[10], "30")]),
  );
});
