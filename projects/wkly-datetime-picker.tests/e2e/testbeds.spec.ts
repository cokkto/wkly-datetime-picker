import { test, expect } from "./fixtures";

for (const layout of ["empty", "contained", "form", "booking"]) {
  for (const presentation of ["inline", "dialog", "overlay", "material"]) {
    test(`${layout}: ${presentation} commits in a top-level document`, async ({
      page,
    }, info) => {
      await page.goto(`/cases/${layout}/${presentation}`);
      await expect(page.locator("[data-angular-version]")).toHaveAttribute(
        "data-angular-version",
        String(info.project.metadata.angular),
      );
      await expect(page.locator("iframe")).toHaveCount(0);
      await expect(page.locator("demo-panel")).toHaveCount(1);
      const panel = page.getByTestId(presentation);
      if (presentation === "dialog")
        await panel.getByRole("button", { name: "Open dialog" }).click();
      if (presentation === "overlay")
        await panel
          .getByRole("textbox", { name: "Choose date and time" })
          .click();
      if (presentation === "material")
        await panel
          .getByRole("button", { name: "Open Material picker" })
          .click();
      const picker = page.locator("wkly-datetime-picker");
      await expect(picker).toBeVisible();
      const minute = picker.getByRole("textbox", {
        name: "Minute",
        exact: true,
      });
      await minute.fill("15");
      await minute.press("Tab");
      if (presentation !== "inline") {
        await expect(panel.getByTestId("value")).toContainText("13:00:00");
        await picker.getByRole("button", { name: "Confirm" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
      await expect(panel.getByTestId("value")).toContainText("13:15:00");
      await page.reload();
      await expect(panel.getByTestId("value")).toContainText("13:00:00");
    });
  }
  test(`${layout}: native and CDK dialogs cancel and restore focus`, async ({
    page,
  }) => {
    for (const id of ["dialog", "overlay"]) {
      await page.goto(`/cases/${layout}/${id}`);
      const trigger =
        id === "dialog"
          ? page.getByRole("button", { name: "Open dialog" })
          : page.getByRole("textbox", { name: "Choose date and time" });
      await trigger.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("textbox", { name: "Minute", exact: true })
        .fill("27");
      // Leave the field editor before cancelling the containing presentation.
      await dialog.getByRole("button", { name: "Confirm" }).focus();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();
      await expect(page.getByTestId("value")).toContainText("13:00:00");
    }
  });
}

test("configuration, localization, styling and programmatic validation", async ({
  page,
}) => {
  await page.goto("/cases/empty/custom-style");
  await expect(page.locator("wkly-datetime-picker")).toHaveCSS(
    "--wkly-accent-color",
    "#5146a5",
  );
  await expect(page.locator("wkly-datetime-picker")).toHaveCSS(
    "--wkly-size-multiplier",
    "1.15",
  );
  await page.goto("/cases/empty/arabic");
  await expect(page.getByRole("button", { name: "الآن" })).toBeVisible();
  await page.goto("/cases/empty/constraints");
  await page.getByText("Configure this example").click();
  await page.getByLabel("Programmatic UTC value").fill("invalid-date");
  await page.getByRole("button", { name: "Apply value" }).click();
  await expect(page.getByTestId("validation")).toContainText("malformed-iso");
  await page.getByLabel("Selection mode").selectOption("date");
  await expect(page.getByTestId("value")).toHaveText("null");
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.getByTestId("value")).toContainText("2099-12-16T13:00:00");
});

test("evergreen catalogue renders directly and links to versioned testbeds", async ({
  page,
}, info) => {
  test.skip(info.project.metadata.angular !== "22");
  await page.goto(`http://wkly.localhost:${process.env.PORT || "4200"}/single`);
  await expect(
    page.getByTestId("datetime").locator("wkly-datetime-picker"),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.goto(
    `http://wkly.localhost:${process.env.PORT || "4200"}/calendars`,
  );
  await page.getByRole("button", { name: /1969-12-31/ }).click();
  await expect(
    page.getByTestId("gregorian-pair").getByTestId("value"),
  ).toContainText("1969-12-31");
  await expect(
    page.getByTestId("hebrew-pair").getByTestId("value"),
  ).toContainText("1969-12-31");
  const navigation = page.getByRole("button", { name: "Toggle navigation" });
  if (await navigation.isVisible()) await navigation.click();
  await page
    .getByRole("link", { name: "Angular 11 test cases", exact: true })
    .click();
  await expect(page).toHaveURL(
    `http://v11.wkly.localhost:${process.env.PORT || "4200"}/`,
  );
  await expect(
    page.getByRole("heading", { name: "Angular 11 testbed" }),
  ).toBeVisible();
});
