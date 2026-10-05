const { test, expect } = require("@playwright/test");
test("versioned routes, controls, contained/form presentations and reload", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const layout of ["empty", "contained", "form", "booking"]) {
    await page.goto(`/cases/${layout}/inline`);
    await expect(page.locator("[data-angular-version]")).toHaveAttribute(
      "data-angular-version",
      info.project.metadata.angular,
    );
    await expect(page.locator("iframe")).toHaveCount(0);
    await expect(page.locator("demo-panel")).toHaveCount(1);
    const minute = page.getByRole("textbox", { name: "Minute", exact: true });
    await minute.fill("15");
    await minute.press("Tab");
    await expect(page.getByTestId("value")).toContainText("13:15:00");
  }
  await page.goto("/cases/empty/constraints");
  await page.getByText("Configure this example").click();
  await page.getByLabel("Programmatic UTC value").fill("invalid-date");
  await page.getByRole("button", { name: "Apply value" }).click();
  await expect(page.getByTestId("validation")).toContainText("malformed-iso");
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(page.getByTestId("value")).toContainText("2099-12-16T13:00:00");
  await page.reload();
  await expect(page.locator("[data-angular-version]")).toHaveAttribute(
    "data-angular-version",
    info.project.metadata.angular,
  );
  for (const [layout, presentation] of [
    ["contained", "dialog"],
    ["form", "overlay"],
    ["form", "material"],
  ]) {
    await test.step(`${layout} ${presentation}: commit, cancel and restore focus`, async () => {
      await page.goto(`/cases/${layout}/${presentation}`);
      const panel = page.getByTestId(presentation);
      const trigger =
        presentation === "dialog"
          ? panel.getByRole("button", { name: "Open dialog", exact: true })
          : presentation === "material"
            ? panel.getByRole("button", {
                name: "Open Material picker",
                exact: true,
              })
            : panel.getByRole("textbox", {
                name: "Choose date and time",
                exact: true,
              });
      const picker = page.locator("wkly-datetime-picker");
      const dialog = page.getByRole("dialog");
      const minute = picker.getByRole("textbox", {
        name: "Minute",
        exact: true,
      });
      const committed = "2099-12-16T13:15:00.000Z";
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expect(picker).toHaveCount(1);
      await expect(page.locator("iframe")).toHaveCount(0);
      await minute.fill("15");
      await minute.press("Enter");
      await expect(panel.getByTestId("value")).toHaveText(
        '"2099-12-16T13:00:00.000Z"',
      );
      await picker
        .getByRole("button", { name: "Confirm", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(panel.getByTestId("value")).toHaveText(
        JSON.stringify(committed),
      );
      await expect(panel.getByTestId("emissions")).toHaveText("1 emissions");
      await trigger.click();
      await expect(minute).toHaveValue("15");
      await minute.fill("27");
      // Escape from the presentation rather than the field's draft editor.
      await picker
        .getByRole("button", { name: "Confirm", exact: true })
        .focus();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      const restored =
        presentation === "material"
          ? panel.locator(".trigger-demo input")
          : trigger;
      await expect(restored).toBeFocused();
      await expect(panel.getByTestId("value")).toHaveText(
        JSON.stringify(committed),
      );
      await expect(panel.getByTestId("emissions")).toHaveText("1 emissions");
      await trigger.click();
      await expect(minute).toHaveValue("15");
      await picker
        .getByRole("button", { name: "Close picker", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(page).toHaveURL(
        new RegExp(`/cases/${layout}/${presentation}$`),
      );
      await page.reload();
      await expect(panel.getByTestId("value")).toHaveText(
        '"2099-12-16T13:00:00.000Z"',
      );
    });
  }
  expect(errors).toEqual([]);
});
