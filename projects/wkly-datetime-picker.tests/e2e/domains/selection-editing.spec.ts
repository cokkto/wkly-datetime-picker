import { test, expect, codes, emissions, PickerFixture } from "../fixtures";

const iso = (day: number) => `2099-12-${day}T00:00:00.000Z`;
const dayButton = (host: PickerFixture, day: number) =>
  host.picker.locator(
    `button.day[data-day="${Date.UTC(2099, 11, day) / 86400000}"]`,
  );
const field = (host: PickerFixture, name: string) =>
  host.picker.getByRole("textbox", { name, exact: true });
async function edit(host: PickerFixture, name: string, value: string) {
  await field(host, name).fill(value);
  await field(host, name).press("Enter");
}
async function valueIs(host: PickerFixture, value: unknown) {
  await expect.poll(async () => (await host.snapshot()).value).toEqual(value);
}

const endGroup = (host: PickerFixture) =>
  host.picker.getByRole("group", { name: "End", exact: true });
const daysField = (host: PickerFixture) => field(host, "Days");
async function openDays(host: PickerFixture) {
  await host.picker.getByRole("button", { name: "Manual date entry" }).click();
  await endGroup(host)
    .getByRole("button", { name: /^In .* days$/ })
    .click();
}

for (const mode of ["date-range", "datetime-range"] as const) {
  test.describe(`${mode} manual range defaults`, () => {
    test.use({
      suite: "manual",
      spec: {
        inputs: {
          mode,
          locale: "en-GB",
          hourCycle: "h24",
          showSeconds: true,
          required: true,
        },
        clock: "2099-12-16T13:37:42.000Z",
        value: null,
      },
    });
    test("entering manual mode initializes both endpoints so editing only End completes a valid range", async ({
      host,
    }) => {
      expect(codes(await host.snapshot())).toEqual(["incomplete"]);
      await host.inputs({ minuteStep: 15, secondStep: 5 });
      await host.picker
        .getByRole("button", { name: "Manual date entry" })
        .click();
      await expect.poll(async () => codes(await host.snapshot())).toEqual([]);
      for (const endpoint of ["Start", "End"]) {
        const group = host.picker.getByRole("group", {
          name: endpoint,
          exact: true,
        });
        await expect(
          group.getByRole("textbox", { name: "Day", exact: true }),
        ).toHaveValue("16");
        if (mode === "datetime-range") {
          await expect(
            group.getByRole("textbox", { name: "Hour", exact: true }),
          ).toHaveValue("13");
          await expect(
            group.getByRole("textbox", { name: "Minute", exact: true }),
          ).toHaveValue("30");
          await expect(
            group.getByRole("textbox", { name: "Second", exact: true }),
          ).toHaveValue("40");
        }
      }
      const time = mode === "date-range" ? "00:00:00" : "13:30:40";
      const defaults = [`2099-12-16T${time}.000Z`, `2099-12-16T${time}.000Z`];
      await valueIs(host, defaults);
      expect(emissions(await host.snapshot())).toEqual([defaults]);
      const day = endGroup(host).getByRole("textbox", {
        name: "Day",
        exact: true,
      });
      await day.fill("18");
      await day.press("Enter");
      await valueIs(host, [
        `2099-12-16T${time}.000Z`,
        `2099-12-18T${time}.000Z`,
      ]);
      expect(codes(await host.snapshot())).toEqual([]);
      await host.picker
        .getByRole("button", { name: "Now", exact: true })
        .click();
      await valueIs(host, defaults);
    });

    test("date defaults use the explicit anchor, including epoch day zero", async ({
      host,
    }) => {
      await host.inputs({ initialEpochDay: Date.UTC(2099, 11, 12) / 86400000 });
      await host.picker
        .getByRole("button", { name: "Year", exact: true })
        .click();
      for (const endpoint of ["Start", "End"]) {
        await expect(
          host.picker
            .getByRole("group", { name: endpoint, exact: true })
            .getByRole("textbox", { name: "Day", exact: true }),
        ).toHaveValue("12");
      }
      await host.picker.getByRole("button", { name: "Calendar view" }).click();
      await host.inputs({ initialEpochDay: 0 });
      await host.write(null);
      await host.picker
        .getByRole("button", { name: "Manual date entry" })
        .click();
      await expect(
        endGroup(host).getByRole("textbox", { name: "Year", exact: true }),
      ).toHaveValue("1970");
      await expect(
        endGroup(host).getByRole("textbox", { name: "Day", exact: true }),
      ).toHaveValue("01");
      await expect.poll(async () => codes(await host.snapshot())).toEqual([]);
    });

    test("editing only relative days works from an empty range and clearing reinitializes on reentry", async ({
      host,
    }) => {
      await openDays(host);
      await expect(daysField(host)).toHaveValue("0");
      await edit(host, "Days", "2");
      const time = mode === "date-range" ? "00:00:00" : "13:37:42";
      await valueIs(host, [
        `2099-12-16T${time}.000Z`,
        `2099-12-18T${time}.000Z`,
      ]);
      await host.picker.getByRole("button", { name: "Calendar view" }).click();
      await host.write(null);
      await host.picker
        .getByRole("button", { name: "Manual date entry" })
        .click();
      await expect(daysField(host)).toHaveValue("0");
      await expect.poll(async () => codes(await host.snapshot())).toEqual([]);
    });

    test("partial calendar selections and supplied ranges survive manual entry and reentry", async ({
      host,
    }) => {
      await dayButton(host, 18).click();
      expect(codes(await host.snapshot())).toContain("incomplete");
      await host.picker
        .getByRole("button", { name: "Manual date entry" })
        .click();
      for (const endpoint of ["Start", "End"]) {
        await expect(
          host.picker
            .getByRole("group", { name: endpoint, exact: true })
            .getByRole("textbox", { name: "Day", exact: true }),
        ).toHaveValue("18");
      }
      const value =
        mode === "date-range"
          ? ([iso(15), iso(19)] as const)
          : (["2099-12-15T09:25:35.000Z", "2099-12-19T17:30:45.000Z"] as const);
      await host.write(value);
      const before = emissions(await host.snapshot());
      await host.picker.getByRole("button", { name: "Calendar view" }).click();
      await host.picker
        .getByRole("button", { name: "Manual date entry" })
        .click();
      await valueIs(host, value);
      await expect(
        endGroup(host).getByRole("textbox", { name: "Day", exact: true }),
      ).toHaveValue("19");
      if (mode === "datetime-range") {
        await expect(
          endGroup(host).getByRole("textbox", { name: "Hour", exact: true }),
        ).toHaveValue("17");
        await expect(
          endGroup(host).getByRole("textbox", { name: "Minute", exact: true }),
        ).toHaveValue("30");
        await expect(
          endGroup(host).getByRole("textbox", { name: "Second", exact: true }),
        ).toHaveValue("45");
      }
      const day = endGroup(host).getByRole("textbox", {
        name: "Day",
        exact: true,
      });
      await day.fill("");
      await day.press("Enter");
      expect(codes(await host.snapshot())).toContain("incomplete");
      await host.picker.getByRole("button", { name: "Calendar view" }).click();
      await host.picker
        .getByRole("button", { name: "Manual date entry" })
        .click();
      await expect(day).toHaveValue("");
      expect(codes(await host.snapshot())).toContain("incomplete");
      expect(emissions(await host.snapshot())).toEqual(before);
    });

    test.describe("application defaults", () => {
      test.use({
        spec: {
          config: { initialEpochDay: Date.UTC(2099, 11, 10) / 86400000 },
          inputs: {
            mode,
            locale: "en-GB",
            initialEpochDay: Date.UTC(2099, 11, 12) / 86400000,
          },
          clock: "2099-12-16T13:37:42.000Z",
          value: null,
        },
      });
      test("the input anchor overrides configuration and clearing it restores the configured date", async ({
        host,
      }) => {
        await host.picker
          .getByRole("button", { name: "Manual date entry" })
          .click();
        await expect(
          endGroup(host).getByRole("textbox", { name: "Day", exact: true }),
        ).toHaveValue("12");
        await host.picker
          .getByRole("button", { name: "Calendar view" })
          .click();
        await host.inputs({ initialEpochDay: null });
        await host.write(null);
        await host.picker
          .getByRole("button", { name: "Manual date entry" })
          .click();
        for (const endpoint of ["Start", "End"]) {
          await expect(
            host.picker
              .getByRole("group", { name: endpoint, exact: true })
              .getByRole("textbox", { name: "Day", exact: true }),
          ).toHaveValue("10");
        }
        expect(codes(await host.snapshot())).toEqual([]);
      });
    });
  });
}

test.describe("In X Days", () => {
  test.use({
    suite: "manual",
    spec: {
      inputs: { mode: "date-range", locale: "en-GB" },
      value: [iso(16), iso(16)],
    },
  });

  test("calendar, date fields, start edits and relative days stay synchronized when views switch", async ({
    host,
  }) => {
    await dayButton(host, 17).click();
    await dayButton(host, 20).click();
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    const end = endGroup(host);
    await expect(
      end.getByRole("button", { name: "In 3 days", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    const day = end.getByRole("textbox", { name: "Day", exact: true });
    await day.fill("21");
    await day.press("Enter");
    await expect(
      end.getByRole("button", { name: "In 4 days", exact: true }),
    ).toBeVisible();
    await end.getByRole("button", { name: "In 4 days", exact: true }).click();
    await expect(daysField(host)).toHaveValue("4");
    await edit(host, "Days", "7");
    await valueIs(host, [iso(17), iso(24)]);
    await expect(end.locator(".resulting-end-date")).toHaveText(
      "24 December 2099",
    );
    const start = host.picker
      .getByRole("group", { name: "Start", exact: true })
      .getByRole("textbox", { name: "Day", exact: true });
    await start.fill("18");
    await start.press("Enter");
    await expect(daysField(host)).toHaveValue("6");
    const before = emissions(await host.snapshot());
    await end.getByRole("button", { name: "End", exact: true }).click();
    await expect(day).toHaveValue("24");
    await end.getByRole("button", { name: "In 6 days", exact: true }).click();
    expect(emissions(await host.snapshot())).toEqual(before);
    await host.picker.getByRole("button", { name: "Calendar view" }).click();
    await dayButton(host, 15).click();
    await dayButton(host, 18).click();
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    await expect(daysField(host)).toHaveValue("3");
    await host.write([iso(16), iso(20)]);
    await expect(daysField(host)).toHaveValue("4");
    await daysField(host).fill("5");
    const written = emissions(await host.snapshot());
    await host.write([iso(16), iso(19)]);
    await expect(daysField(host)).toHaveValue("3");
    await host.page.waitForTimeout(1100);
    expect(emissions(await host.snapshot())).toEqual(written);
  });

  test("negative typing previews the end date and swaps both displayed endpoints after the typing debounce", async ({
    host,
  }) => {
    await openDays(host);
    await daysField(host).fill("-17");
    await expect(
      endGroup(host).getByRole("button", { name: "In -17 days", exact: true }),
    ).toBeVisible();
    await expect(endGroup(host).locator(".resulting-end-date")).toHaveText(
      "29 November 2099",
    );
    await host.page.waitForTimeout(600);
    await valueIs(host, [iso(16), iso(16)]);
    expect(emissions(await host.snapshot())).toEqual([]);
    await expect(daysField(host)).toHaveValue("17");
    await expect(daysField(host)).toBeFocused();
    await valueIs(host, ["2099-11-29T00:00:00.000Z", iso(16)]);
    await expect(
      endGroup(host).getByRole("button", { name: "In 17 days", exact: true }),
    ).toBeVisible();
    await endGroup(host)
      .getByRole("button", { name: "End", exact: true })
      .click();
    await expect(
      endGroup(host).getByRole("textbox", { name: "Day", exact: true }),
    ).toHaveValue("16");
    await expect(
      host.picker
        .getByRole("group", { name: "Start", exact: true })
        .getByRole("textbox", { name: "Month", exact: true }),
    ).toHaveValue("November");
  });

  test("wheel input crosses zero and reuses wheel settlement to swap the range", async ({
    host,
  }) => {
    await openDays(host);
    await daysField(host).hover();
    await host.page.mouse.wheel(0, -60);
    await expect(daysField(host)).toHaveValue("-1");
    await expect(
      endGroup(host).getByRole("button", { name: "In -1 days", exact: true }),
    ).toBeVisible();
    await valueIs(host, [iso(15), iso(16)]);
    await expect(daysField(host)).toHaveValue("1");
    expect(emissions(await host.snapshot())).toEqual([[iso(15), iso(16)]]);
    await host.disable(true);
    await daysField(host).hover();
    await host.page.mouse.wheel(0, -60);
    await host.page.waitForTimeout(200);
    await expect(daysField(host)).toHaveValue("1");
    expect(emissions(await host.snapshot())).toHaveLength(1);
  });

  test("manual past-year entry uses the same displayed endpoint swap", async ({
    host,
  }) => {
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    const year = endGroup(host).getByRole("textbox", {
      name: "Year",
      exact: true,
    });
    await year.fill("2098");
    await expect(
      endGroup(host).getByRole("button", { name: "In -365 days", exact: true }),
    ).toBeVisible();
    await expect(year).toHaveValue("2099");
    await valueIs(host, ["2098-12-16T00:00:00.000Z", iso(16)]);
    await expect(
      endGroup(host).getByRole("button", { name: "In 365 days", exact: true }),
    ).toBeVisible();
  });

  test("empty and signed-limit inputs recover and Escape restores the previous day count", async ({
    host,
  }) => {
    await openDays(host);
    await daysField(host).fill("-");
    await expect(daysField(host)).toHaveValue("-");
    await expect
      .poll(async () => codes(await host.snapshot()))
      .toContain("incomplete");
    await daysField(host).press("Escape");
    await expect(daysField(host)).toHaveValue("0");
    for (const [typed, expected] of [
      ["10000", "9999"],
      ["-10000", "-9999"],
    ]) {
      await daysField(host).fill(typed);
      await expect(daysField(host)).toHaveValue(expected);
      await daysField(host).press("Escape");
      await expect(daysField(host)).toHaveValue("0");
    }
    await daysField(host).focus();
    await daysField(host).pressSequentially("-017");
    await expect(daysField(host)).toHaveValue("-017");
    await expect(
      endGroup(host).getByRole("button", { name: "In -17 days", exact: true }),
    ).toBeVisible();
    await daysField(host).press("Escape");
    await edit(host, "Days", "0");
    await valueIs(host, [iso(16), iso(16)]);
    expect(codes(await host.snapshot())).toEqual([]);
  });

  test("both views keep the same height, input line and palette divider in narrow RTL layouts", async ({
    host,
  }) => {
    await host.page.setViewportSize({ width: 320, height: 1000 });
    await host.picker.evaluate((el) => {
      el.style.setProperty("--wkly-text-color", "rgb(234, 235, 236)");
      el.style.setProperty("--wkly-background-color", "rgb(30, 31, 32)");
    });
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    const end = endGroup(host);
    for (const direction of ["ltr", "rtl"]) {
      await host.picker
        .locator("section.wkly")
        .evaluate((el, dir) => el.setAttribute("dir", dir), direction);
      const before = await end.boundingBox();
      const year = await end
        .getByRole("textbox", { name: "Year", exact: true })
        .boundingBox();
      const toggle = end.getByRole("button", {
        name: "In 0 days",
        exact: true,
      });
      await toggle.click();
      const after = await end.boundingBox();
      const input = await daysField(host).boundingBox();
      expect(after!.height).toBeCloseTo(before!.height, 1);
      expect(input!.y).toBeCloseTo(year!.y, 1);
      const divider = await toggle.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          width: parseFloat(style.borderInlineStartWidth),
          style: style.borderInlineStartStyle,
          color: style.borderInlineStartColor,
        };
      });
      // Firefox rounds the declared CSS pixel to its physical pixel grid.
      expect(Math.abs(divider.width - 1)).toBeLessThan(0.2);
      expect(divider.style).toBe("solid");
      expect(divider.color).toBe("rgb(234, 235, 236)");
      await end.getByRole("button", { name: "End", exact: true }).click();
    }
  });
});

test.describe("In X Days validation", () => {
  test.use({
    suite: "manual",
    spec: {
      inputs: { mode: "date-range", locale: "en-GB", max: iso(20) },
      value: [iso(16), iso(16)],
      disabledEpochDays: [Date.UTC(2099, 11, 18) / 86400000],
    },
  });
  test("relative and date controls show the same end-date validation and preserve the committed range", async ({
    host,
  }) => {
    await openDays(host);
    for (const [days, code] of [
      ["5", "above-maximum"],
      ["2", "disabled-endpoint"],
    ]) {
      await edit(host, "Days", days);
      await expect
        .poll(async () => codes(await host.snapshot()))
        .toContain(code);
      await expect(daysField(host)).toHaveAttribute("aria-invalid", "true");
      expect(
        await daysField(host).evaluate(
          (el) => getComputedStyle(el).borderBlockStartColor,
        ),
      ).toBe("rgb(180, 35, 24)");
      const before = codes(await host.snapshot());
      await endGroup(host)
        .getByRole("button", { name: "End", exact: true })
        .click();
      expect(codes(await host.snapshot())).toEqual(before);
      await endGroup(host)
        .getByRole("button", { name: /^In .* days$/ })
        .click();
      await valueIs(host, [iso(16), iso(16)]);
    }
    await edit(host, "Days", "1");
    await valueIs(host, [iso(16), iso(17)]);
    expect(codes(await host.snapshot())).toEqual([]);
  });
});

test.describe("localized In X Days", () => {
  test.use({
    suite: "manual",
    spec: {
      inputs: {
        mode: "datetime-range",
        locale: "ar-EG-u-nu-arab",
        showSeconds: true,
      },
      translations: {
        ar: {
          inDays: "خلال {{days}} يومًا",
          days: "الأيام",
          daysPrevious: "السابق",
          daysNext: "التالي",
        },
      },
      value: ["2099-12-16T13:25:42.000Z", "2099-12-16T16:30:45.000Z"],
    },
  });
  test("localized labels, signed Arabic digits and endpoint times survive the swap", async ({
    host,
  }) => {
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    const end = endGroup(host);
    await end
      .getByRole("button", { name: "خلال ٠ يومًا", exact: true })
      .click();
    const input = field(host, "الأيام");
    await input.fill("−١٧");
    await input.press("Enter");
    await valueIs(host, [
      "2099-11-29T16:30:45.000Z",
      "2099-12-16T13:25:42.000Z",
    ]);
    await expect(input).toHaveValue("١٧");
    await expect(end.locator(".resulting-end-date")).toHaveText(
      "١٦ ديسمبر ٢٠٩٩",
    );
    await expect(
      end.getByRole("button", { name: "خلال ١٧ يومًا", exact: true }),
    ).toBeVisible();
    await expect(
      end.getByRole("button", { name: "السابق", exact: true }),
    ).toBeVisible();
    await expect(
      end.getByRole("button", { name: "التالي", exact: true }),
    ).toBeVisible();
  });
});

test.describe("calendar selection", () => {
  test.use({
    suite: "calendar",
    spec: { inputs: { mode: "date", locale: "en-GB" }, value: iso(16) },
  });
  test("a new day replaces selection and repeat selection does not emit twice", async ({
    host,
  }) => {
    await dayButton(host, 17).click();
    await dayButton(host, 17).click();
    await valueIs(host, iso(17));
    await expect(host.picker.locator("button.day.selected")).toHaveCount(1);
    await expect(dayButton(host, 17).locator("..")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(emissions(await host.snapshot())).toEqual([iso(17)]);
  });
});

test.describe("range selection", () => {
  test.use({
    suite: "calendar",
    spec: {
      inputs: {
        mode: "date-range",
        locale: "en-GB",
        required: true,
        min: iso(15),
        max: iso(20),
      },
      clock: iso(16),
    },
  });
  test("incomplete endpoints become an ordered range and a new click starts another", async ({
    host,
  }) => {
    expect(codes(await host.snapshot())).toEqual(["incomplete"]);
    await dayButton(host, 18).click();
    expect(codes(await host.snapshot())).toContain("incomplete");
    expect(emissions(await host.snapshot())).toEqual([]);
    await dayButton(host, 15).click();
    await valueIs(host, [iso(15), iso(18)]);
    expect(codes(await host.snapshot())).toEqual([]);
    for (const day of [15, 18])
      await expect(dayButton(host, day).locator("..")).toHaveAttribute(
        "aria-selected",
        "true",
      );
    await expect(dayButton(host, 16).locator("..")).toHaveClass(/range/);
    await dayButton(host, 17).click();
    expect(codes(await host.snapshot())).toContain("incomplete");
    await valueIs(host, [iso(15), iso(18)]);
    await dayButton(host, 17).click();
    await valueIs(host, [iso(17), iso(17)]);
    expect(emissions(await host.snapshot())).toEqual([
      [iso(15), iso(18)],
      [iso(17), iso(17)],
    ]);
  });
});

test.describe("empty constrained range", () => {
  test.use({
    suite: "calendar",
    spec: {
      inputs: {
        mode: "date-range",
        locale: "en-GB",
        required: true,
        min: "2099-12-01T00:00:00.000Z",
        max: "2100-01-31T23:59:00.000Z",
      },
      value: null,
      disabledEpochDays: [13, 20, 27].map(
        (day) => Date.UTC(2099, 11, day) / 86400000,
      ),
    },
  });
  test("an empty constrained range opens on selectable dates with one completion message until the second endpoint", async ({
    host,
  }) => {
    const first = host.picker.getByRole("button", {
      name: "Thursday, 17 December 2099",
      exact: true,
    });
    const second = host.picker.getByRole("button", {
      name: "Friday, 18 December 2099",
      exact: true,
    });
    const messages = host.picker.getByRole("status").locator("p");
    await expect(first).toBeVisible();
    await expect(dayButton(host, 16)).toHaveAttribute("tabindex", "0");
    await expect(dayButton(host, 16)).toHaveAttribute("aria-disabled", "false");
    await expect(first).toHaveAttribute("aria-disabled", "false");
    await expect(dayButton(host, 20)).toHaveAttribute("aria-disabled", "true");
    await expect(messages).toHaveCount(1);
    await expect(messages).toHaveText(
      "! Complete all fields and both range endpoints.",
    );
    expect(codes(await host.snapshot())).toEqual(["incomplete"]);
    await first.click();
    await expect(messages).toHaveCount(1);
    expect(codes(await host.snapshot())).toEqual(["incomplete"]);
    expect(emissions(await host.snapshot())).toEqual([]);
    await second.click();
    const range = [iso(17), iso(18)];
    await valueIs(host, range);
    await expect(messages).toHaveCount(0);
    expect(codes(await host.snapshot())).toEqual([]);
    expect(emissions(await host.snapshot())).toEqual([range]);
  });
});

for (const mode of ["date", "datetime"] as const) {
  test.describe(`${mode} Now selection`, () => {
    const time = mode === "date" ? "00:00:00" : "13:00:00";
    test.use({
      suite: "calendar",
      spec: {
        inputs: { mode, locale: "en-GB" },
        value: `2099-12-15T${time}.000Z`,
      },
    });
    test("Now followed by another day replaces the only selected cell", async ({
      host,
    }) => {
      await host.picker
        .getByRole("button", { name: "Now", exact: true })
        .click();
      await valueIs(host, `2099-12-16T${time}.000Z`);
      await expect(host.picker.locator("button.day.selected")).toHaveCount(1);
      await dayButton(host, 17).click();
      await valueIs(host, `2099-12-17T${time}.000Z`);
      await expect(host.picker.locator("button.day.selected")).toHaveCount(1);
      await expect(dayButton(host, 16)).not.toHaveClass(/selected/);
      await expect(dayButton(host, 17)).toHaveClass(/selected/);
      expect(emissions(await host.snapshot())).toEqual([
        `2099-12-16T${time}.000Z`,
        `2099-12-17T${time}.000Z`,
      ]);
    });
  });
}

test.describe("disabled selection", () => {
  test.use({
    suite: "calendar",
    spec: {
      inputs: { mode: "date", locale: "en-GB" },
      value: iso(16),
      disabledEpochDays: [Date.UTC(2099, 11, 17) / 86400000],
    },
  });
  test("a disabled day rejects a click without changing the committed value", async ({
    host,
  }) => {
    await expect(dayButton(host, 17)).toHaveAttribute("aria-disabled", "true");
    await dayButton(host, 17).click({ force: true });
    await valueIs(host, iso(16));
    expect(emissions(await host.snapshot())).toEqual([]);
    await dayButton(host, 18).click();
    await valueIs(host, iso(18));
  });
});

test.describe("manual date", () => {
  test.use({
    suite: "manual",
    spec: {
      inputs: { mode: "date", locale: "en-GB" },
      value: "2100-01-31T00:00:00.000Z",
    },
  });
  test("invalid and empty drafts preserve the committed value and recover in the matching calendar", async ({
    host,
  }) => {
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    await field(host, "Month").fill("2");
    await expect
      .poll(async () => codes(await host.snapshot()))
      .toContain("invalid-calendar-date");
    await field(host, "Month").press("Enter");
    await valueIs(host, "2100-01-31T00:00:00.000Z");
    expect(emissions(await host.snapshot())).toEqual([]);
    await host.picker.getByRole("button", { name: "Calendar view" }).click();
    await expect(host.picker.locator(".week-navigation")).toContainText(
      "February 2100",
    );
    await expect(host.picker.locator(".day.selected")).toHaveCount(0);
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    await expect(field(host, "Day")).toHaveValue("31");
    await field(host, "Day").fill("");
    await expect
      .poll(async () => codes(await host.snapshot()))
      .toContain("incomplete");
    await edit(host, "Day", "28");
    await valueIs(host, "2100-02-28T00:00:00.000Z");
    await host.picker.getByRole("button", { name: "Calendar view" }).click();
    await expect(
      host.picker.getByRole("button", {
        name: "Sunday, 28 February 2100",
        exact: true,
      }),
    ).toHaveClass(/selected/);
    await host.picker
      .getByRole("button", { name: "Saturday, 27 February 2100", exact: true })
      .click();
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    await expect(field(host, "Day")).toHaveValue("27");
    await valueIs(host, "2100-02-27T00:00:00.000Z");
  });
});

test.describe("manual range", () => {
  test.use({
    suite: "manual",
    spec: {
      inputs: { mode: "date-range", locale: "en-GB" },
      value: [iso(16), iso(16)],
    },
  });
  test("both edited endpoints and the interior appear in one calendar", async ({
    host,
  }) => {
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    for (const [index, day] of ["15", "18"].entries()) {
      const input = host.picker
        .locator("fieldset")
        .nth(index)
        .getByRole("textbox", { name: "Day", exact: true });
      await input.fill(day);
      await input.press("Enter");
    }
    await valueIs(host, [iso(15), iso(18)]);
    await host.picker.getByRole("button", { name: "Calendar view" }).click();
    await expect(host.picker.getByRole("grid")).toHaveCount(1);
    for (const day of [15, 18])
      await expect(dayButton(host, day)).toHaveClass(/selected/);
    await expect(dayButton(host, 16).locator("..")).toHaveClass(/range/);
  });
});

test.describe("typing", () => {
  test.use({
    suite: "manual",
    spec: {
      inputs: { mode: "datetime", locale: "en-GB", showSeconds: true },
      value: "2099-12-16T13:00:00.000Z",
    },
  });
  test("trailing digits, pause and blur commit without losing field focus", async ({
    host,
  }) => {
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    const day = field(host, "Day");
    await day.fill("");
    await day.pressSequentially("123");
    await expect(day).toHaveValue("23");
    await valueIs(host, "2099-12-23T13:00:00.000Z");
    await expect(day).toBeFocused();
    for (const [name, text, value] of [
      ["Year", "2100", "2100-12-23T13:00:00.000Z"],
      ["Month", "11", "2100-11-23T13:00:00.000Z"],
      ["Hour", "14", "2100-11-23T14:00:00.000Z"],
      ["Minute", "25", "2100-11-23T14:25:00.000Z"],
      ["Second", "42", "2100-11-23T14:25:42.000Z"],
    ]) {
      await field(host, name).fill(text);
      await valueIs(host, value);
      await expect(field(host, name)).toBeFocused();
    }
    await field(host, "Minute").fill("26");
    await field(host, "Minute").press("Tab");
    await valueIs(host, "2100-11-23T14:26:42.000Z");
    expect(emissions(await host.snapshot())).toHaveLength(7);
  });
  test("numeric month typing resets its timer and unique names resolve within 700 ms", async ({
    host,
  }) => {
    await host.picker
      .getByRole("button", { name: "Manual date entry" })
      .click();
    const month = field(host, "Month");
    await month.fill("1");
    await host.page.waitForTimeout(600);
    await expect(month).toHaveValue("1");
    await valueIs(host, "2099-12-16T13:00:00.000Z");
    expect(emissions(await host.snapshot())).toEqual([]);
    await month.press("1");
    // Cross the first digit's deadline while staying below the second's deadline.
    await host.page.waitForTimeout(600);
    await expect(month).toHaveValue("11");
    await valueIs(host, "2099-12-16T13:00:00.000Z");
    expect(emissions(await host.snapshot())).toEqual([]);
    await expect(month).toHaveValue("November");
    await valueIs(host, "2099-11-16T13:00:00.000Z");
    await month.fill("emb");
    await month.press("Enter");
    await valueIs(host, "2099-11-16T13:00:00.000Z");
    await month.fill("Dec");
    await expect
      .poll(async () => (await host.snapshot()).value, {
        timeout: 700,
        intervals: [25, 50, 100],
      })
      .toBe("2099-12-16T13:00:00.000Z");
    await expect(month).toHaveValue("December");
    expect(emissions(await host.snapshot())).toHaveLength(2);
  });
});

for (const mode of ["datetime-range", "time-range"] as const) {
  test.describe(`${mode} endpoints`, () => {
    const date = mode === "time-range" ? "0000-01-01" : "2099-12-16";
    test.use({
      suite: "time",
      spec: {
        inputs: { mode, locale: "en-GB" },
        value: [`${date}T13:00:00.000Z`, `${date}T14:00:00.000Z`],
      },
    });
    test("editing either endpoint preserves the other endpoint", async ({
      host,
    }) => {
      for (const [name, minute] of [
        ["Start", "15"],
        ["End", "30"],
      ]) {
        const input = host.picker
          .getByRole("group", { name, exact: true })
          .getByRole("textbox", { name: "Minute", exact: true });
        await input.fill(minute);
        await input.press("Enter");
      }
      await valueIs(host, [`${date}T13:15:00.000Z`, `${date}T14:30:00.000Z`]);
      expect(codes(await host.snapshot())).toEqual([]);
      expect(emissions(await host.snapshot())).toEqual([
        [`${date}T13:15:00.000Z`, `${date}T14:00:00.000Z`],
        [`${date}T13:15:00.000Z`, `${date}T14:30:00.000Z`],
      ]);
    });
  });
}

for (const mode of ["datetime", "time"] as const) {
  test.describe(`${mode} fields`, () => {
    const date = mode === "time" ? "0000-01-01" : "2099-12-16";
    test.use({
      suite: "time",
      spec: {
        inputs: {
          mode,
          locale: "en-GB",
          minuteStep: 5,
          hourCycle: "switchable",
        },
        value: `${date}T13:00:00.000Z`,
      },
    });
    test("invalid steps do not commit; stepping wraps without carry; Escape restores; seconds and hour cycles work", async ({
      host,
    }) => {
      await edit(host, "Minute", "13");
      expect(codes(await host.snapshot())).toContain("step-mismatch");
      expect(emissions(await host.snapshot())).toEqual([]);
      await edit(host, "Minute", "55");
      await host.picker
        .getByRole("button", { name: "Minute: next", exact: true })
        .click();
      await valueIs(host, `${date}T13:00:00.000Z`);
      await field(host, "Hour").fill("24");
      await expect
        .poll(async () => codes(await host.snapshot()))
        .toContain("invalid-time");
      await field(host, "Hour").press("Escape");
      await expect(field(host, "Hour")).toHaveValue("13");
      await host.picker
        .getByRole("button", { name: "AM", exact: true })
        .click();
      await valueIs(host, `${date}T01:00:00.000Z`);
      await host.picker
        .getByRole("button", { name: "24", exact: true })
        .click();
      await expect(field(host, "Hour")).toHaveValue("01");
      await host.inputs({ showSeconds: true, secondStep: 5 });
      await edit(host, "Second", "42");
      expect(codes(await host.snapshot())).toContain("step-mismatch");
      await edit(host, "Second", "55");
      await host.picker
        .getByRole("button", { name: "Second: next", exact: true })
        .click();
      await valueIs(host, `${date}T01:00:00.000Z`);
      expect(codes(await host.snapshot())).toEqual([]);
      expect(emissions(await host.snapshot())).toEqual([
        `${date}T13:55:00.000Z`,
        `${date}T13:00:00.000Z`,
        `${date}T01:00:00.000Z`,
        `${date}T01:00:55.000Z`,
        `${date}T01:00:00.000Z`,
      ]);
    });
    test("minute wheel bursts settle once, wrap without hour carry and ignore disabled fields", async ({
      host,
    }) => {
      await host.write(`${date}T13:55:00.000Z`);
      const minute = field(host, "Minute");
      for (const [direction, expected] of [
        [1, "05"],
        [-1, "55"],
      ] as const) {
        await minute.hover();
        await host.page.mouse.wheel(0, direction * 60);
        await host.page.mouse.wheel(0, direction * 60);
        await expect(minute).toHaveValue(expected);
        await valueIs(host, `${date}T13:${expected}:00.000Z`);
        await expect(field(host, "Hour")).toHaveValue("13");
        expect(codes(await host.snapshot())).toEqual([]);
      }
      expect(emissions(await host.snapshot())).toEqual([
        `${date}T13:05:00.000Z`,
        `${date}T13:55:00.000Z`,
      ]);
      await host.disable(true);
      await minute.hover();
      await host.page.mouse.wheel(0, 60);
      // Allow a wrongly scheduled wheel commit to surface before inspecting emissions.
      await host.page.waitForTimeout(200);
      await expect(minute).toHaveValue("55");
      expect(emissions(await host.snapshot())).toHaveLength(2);
      await valueIs(host, `${date}T13:55:00.000Z`);
    });
  });
}
