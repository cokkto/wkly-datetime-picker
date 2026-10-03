import { test, expect } from "../fixtures";
import { openPicker, visibleDays } from "../helpers/picker";

test.use({ timezoneId: "America/New_York" });
for (const calendar of ["hebrew", "hijri"]) {
  test(`${calendar}: navigation, date/time selection and localized manual validation`, async ({
    page,
  }) => {
    const { picker, panel, scroller } = await openPicker(
      page,
      calendar,
      "en-GB",
    );
    const initial = await panel.getByTestId("value").textContent();
    const days = await visibleDays(scroller);
    await picker
      .getByRole("button", { name: "Next week", exact: true })
      .click();
    await expect
      .poll(async () => (await visibleDays(scroller))[0])
      .toBe(days[0] + 7);
    await picker
      .getByRole("button", { name: "Previous week", exact: true })
      .click();
    await expect.poll(() => visibleDays(scroller)).toEqual(days);
    await expect(panel.getByTestId("value")).toHaveText(initial!);
    await picker.locator(`button.day[data-day='${days[8]}']`).click();
    const iso = new Date(days[8] * 86400000).toISOString().slice(0, 10);
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify(iso + "T13:00:00.000Z"),
    );
    const minute = picker.getByRole("textbox", { name: "Minute", exact: true });
    await minute.fill("١٥");
    await minute.press("Enter");
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify(iso + "T13:15:00.000Z"),
    );
    await panel.getByText("Configure this example", { exact: true }).click();
    await panel
      .getByLabel("Programmatic UTC value", { exact: true })
      .fill("2024-03-11T13:15:00.000Z");
    await panel
      .getByRole("button", { name: "Apply value", exact: true })
      .click();
    await expect(picker.locator(".day.selected")).toHaveAttribute(
      "data-day",
      "19793",
    );
    await panel.getByText("Configure this example", { exact: true }).click();
    await picker
      .getByRole("button", { name: "Manual date entry", exact: true })
      .click();
    const day = picker.getByRole("textbox", { name: "Day", exact: true });
    await day.fill("٣١");
    await day.press("Enter");
    await expect(day).toHaveValue("31");
    await expect(panel.getByTestId("validation")).toHaveText(
      "invalid-calendar-date",
    );
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify("2024-03-11T13:15:00.000Z"),
    );
    await day.fill("١٥");
    await day.press("Enter");
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify("2024-03-25T13:15:00.000Z"),
    );
    await expect(panel.getByTestId("validation")).toHaveText("valid");
  });
  test(`${calendar}: datetime range orders Gregorian endpoints and edits independent times`, async ({
    page,
  }) => {
    const { picker, panel, scroller } = await openPicker(
      page,
      calendar,
      "en-GB",
    );
    await panel.getByText("Configure this example", { exact: true }).click();
    await panel
      .getByRole("combobox", { name: "Selection mode", exact: true })
      .selectOption("datetime-range");
    await panel.getByText("Configure this example", { exact: true }).click();
    const days = await visibleDays(scroller);
    await picker.locator(`button.day[data-day='${days[10]}']`).click();
    await picker.locator(`button.day[data-day='${days[8]}']`).click();
    const expected = [days[8], days[10]].map((day) =>
      new Date(day * 86400000).toISOString().slice(0, 10),
    );
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify(expected.map((date) => date + "T00:00:00.000Z")),
    );
    const minutes = picker.getByRole("textbox", {
      name: "Minute",
      exact: true,
    });
    await minutes.nth(0).fill("١٥");
    await minutes.nth(0).press("Enter");
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify([
        expected[0] + "T00:15:00.000Z",
        expected[1] + "T00:00:00.000Z",
      ]),
    );
    await minutes.nth(1).fill("٣٠");
    await minutes.nth(1).press("Enter");
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify([
        expected[0] + "T00:15:00.000Z",
        expected[1] + "T00:30:00.000Z",
      ]),
    );
    for (const day of [days[8], days[10]])
      await expect(
        picker.locator(`button.day[data-day='${day}']`).locator(".."),
      ).toHaveAttribute("aria-selected", "true");
    await expect(panel.getByTestId("validation")).toHaveText("valid");
  });
  test(`${calendar}: programmatic boundaries and UTC bounds validation`, async ({
    page,
  }) => {
    const { picker, panel } = await openPicker(page, calendar, "en-GB");
    await panel.getByText("Configure this example", { exact: true }).click();
    const apply = async (iso: string) => {
      await panel
        .getByLabel("Programmatic UTC value", { exact: true })
        .fill(iso);
      await panel
        .getByRole("button", { name: "Apply value", exact: true })
        .click();
      await expect(panel.getByTestId("value")).toHaveText(JSON.stringify(iso));
    };
    for (const iso of [
      "1900-01-01T00:00:00.000Z",
      "2100-12-31T00:00:00.000Z",
    ]) {
      await apply(iso);
      await expect(panel.getByTestId("validation")).toHaveText("valid");
      await expect(picker.locator(".day.selected")).toHaveAttribute(
        "data-day",
        String(Date.parse(iso) / 86400000),
      );
    }
    for (const iso of [
      "1899-12-31T00:00:00.000Z",
      "2101-01-01T00:00:00.000Z",
    ]) {
      await apply(iso);
      await expect(panel.getByTestId("validation")).toHaveText(
        "unsupported-adapter-date",
      );
    }
    await apply("2024-03-25T13:00:00.000Z");
    await panel
      .getByLabel("Minimum UTC value", { exact: true })
      .fill("2024-03-26T00:00:00.000Z");
    await expect(panel.getByTestId("validation")).toHaveText("below-minimum");
  });
}
test("Gregorian, Hebrew and Hijri paired calendars synchronize in both directions", async ({
  page,
}) => {
  await page.goto("/calendars");
  const panels = ["gregorian-pair", "hebrew-pair", "hijri-pair"].map((id) =>
    page.getByTestId(id),
  );
  for (const panel of panels)
    await expect(panel.getByTestId("value")).toHaveText(
      JSON.stringify("2024-03-25T00:00:00.000Z"),
    );
  for (const panel of panels) {
    const scroller = panel.locator(".week-scroll");
    const days = await visibleDays(scroller);
    const day = days[8];
    await panel.locator(`button.day[data-day='${day}']`).click();
    for (const companion of panels) {
      await expect(companion.getByTestId("value")).toHaveText(
        JSON.stringify(new Date(day * 86400000).toISOString()),
      );
      await expect(companion.locator(".day.selected")).toHaveAttribute(
        "data-day",
        String(day),
      );
      await expect(companion.getByTestId("validation")).toHaveText("valid");
    }
  }
});
