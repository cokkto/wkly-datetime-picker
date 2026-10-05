import { expect, PickerFixture } from "./fixtures";

export async function weekColumns(
  host: PickerFixture,
  enabled: boolean,
): Promise<void> {
  await expect(
    host.picker.locator(".week-head [role='columnheader']"),
  ).toHaveCount(enabled ? 8 : 7);
  await expect(host.picker.locator(".week-number")).toHaveCount(
    enabled ? 10 : 0,
  );
  const row = host.picker.locator(".week-row").nth(3);
  await expect(row.getByRole("gridcell")).toHaveCount(7);
  await expect(row.getByRole("rowheader")).toHaveCount(enabled ? 1 : 0);
  for (let index = 0; index < 7; index++)
    await expect(row.getByRole("gridcell").nth(index)).toHaveAttribute(
      "aria-colindex",
      String(index + (enabled ? 2 : 1)),
    );
}
