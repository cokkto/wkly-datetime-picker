import { test, expect } from "../fixtures";
import { openPicker } from "../helpers/picker";

test.use({ timezoneId: "America/New_York" });

for (const locale of ["en-GB", "ar"]) {
  test.describe(locale, () => {
    test("Gregorian boundary values stay exact under a non-UTC browser timezone", async ({
      page,
    }) => {
      const { panel } = await openPicker(page, "date", locale);
      await panel.getByText("Configure this example", { exact: true }).click();
      for (const iso of [
        "0000-01-01T00:00:00.000Z",
        "9999-12-31T00:00:00.000Z",
      ]) {
        await panel
          .getByLabel("Programmatic UTC value", { exact: true })
          .fill(iso);
        await panel
          .getByRole("button", { name: "Apply value", exact: true })
          .click();
        await expect(panel.getByTestId("value")).toHaveText(
          JSON.stringify(iso),
        );
        await expect(panel.getByTestId("validation")).toHaveText("valid");
      }
    });

    test("disabled endpoints and interior range crossings report exact codes", async ({
      page,
    }) => {
      const { panel } = await openPicker(page, "range-constraints", locale);
      await panel.getByText("Configure this example", { exact: true }).click();
      const apply = async (pair: readonly string[]) => {
        await panel
          .getByLabel("Programmatic UTC value", { exact: true })
          .fill(JSON.stringify(pair));
        await panel
          .getByRole("button", { name: "Apply value", exact: true })
          .click();
        await expect(panel.getByTestId("value")).toHaveText(
          JSON.stringify(pair),
        );
      };
      await apply(["2099-12-19T00:00:00.000Z", "2099-12-21T00:00:00.000Z"]);
      await expect(panel.getByTestId("validation")).toHaveText(
        "range-crosses-disabled",
      );
      await panel
        .getByLabel("Allow disabled-range crossing", { exact: true })
        .check();
      await expect(panel.getByTestId("validation")).toHaveText("valid");
      await apply(["2099-12-20T00:00:00.000Z", "2099-12-21T00:00:00.000Z"]);
      await expect(panel.getByTestId("validation")).toHaveText(
        "disabled-endpoint",
      );
    });

    for (const mode of [
      "date",
      "datetime",
      "time",
      "date-range",
      "datetime-range",
      "time-range",
    ] as const) {
      test(`${mode}: UTC values, inclusive bounds and exact rejection codes`, async ({
        page,
      }) => {
        const { panel } = await openPicker(page, mode, locale);
        await panel
          .getByText("Configure this example", { exact: true })
          .click();
        await panel.getByLabel("Show seconds", { exact: true }).uncheck();
        const low = mode.startsWith("time")
          ? "0000-01-01T10:00:00.000Z"
          : mode.startsWith("datetime")
            ? "2024-03-10T10:00:00.000Z"
            : "2024-03-10T00:00:00.000Z";
        const high = mode.startsWith("time")
          ? "0000-01-01T12:00:00.000Z"
          : mode.startsWith("datetime")
            ? "2024-03-11T12:00:00.000Z"
            : "2024-03-11T00:00:00.000Z";
        const value = (iso: string) =>
          mode.endsWith("range") ? [iso, iso] : iso;
        const apply = async (iso: string) => {
          await panel
            .getByLabel("Programmatic UTC value", { exact: true })
            .fill(mode.endsWith("range") ? JSON.stringify(value(iso)) : iso);
          await panel
            .getByRole("button", { name: "Apply value", exact: true })
            .click();
          await expect(panel.getByTestId("value")).toHaveText(
            JSON.stringify(value(iso)),
          );
        };
        const codes = (code: string) =>
          mode.endsWith("range") ? `${code}, ${code}` : code;
        await panel.getByLabel("Minimum UTC value", { exact: true }).fill(low);
        await panel.getByLabel("Maximum UTC value", { exact: true }).fill(low);
        await apply(low);
        await expect(panel.getByTestId("validation")).toHaveText("valid");
        await apply(high);
        await expect(panel.getByTestId("validation")).toHaveText(
          codes("above-maximum"),
        );
        await panel.getByLabel("Maximum UTC value", { exact: true }).fill(high);
        await panel.getByLabel("Minimum UTC value", { exact: true }).fill(high);
        await apply(low);
        await expect(panel.getByTestId("validation")).toHaveText(
          codes("below-minimum"),
        );
        await panel.getByLabel("Minimum UTC value", { exact: true }).fill("");
        await panel.getByLabel("Maximum UTC value", { exact: true }).fill("");
        if (mode.startsWith("time") || mode.startsWith("datetime")) {
          await panel
            .getByRole("combobox", { name: "Minute step", exact: true })
            .selectOption({ label: "15" });
          await apply(low.replace(":00:00.000Z", ":01:00.000Z"));
          await expect(panel.getByTestId("validation")).toHaveText(
            codes("step-mismatch"),
          );
          await apply(low.replace(":00:00.000Z", ":15:00.000Z"));
          await expect(panel.getByTestId("validation")).toHaveText("valid");
        }
        await apply(low.replace("00.000Z", "01.000Z"));
        await expect(panel.getByTestId("validation")).toHaveText(
          codes("malformed-iso"),
        );
        await apply(low);
        await expect(panel.getByTestId("validation")).toHaveText("valid");
      });
    }
  });
}
