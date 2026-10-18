const { test, expect } = require("@playwright/test");
const metadata = require("../../wkly-datetime-picker.showcase/src/page-metadata.json");
const siteMetadata = require("../../wkly-datetime-picker.showcase/src/site-metadata.json");
test("compiled public routes render WKLY controls and initial state", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const [route, info] of Object.entries(metadata)) {
    await test.step(route || "overview", async () => {
      const response = await page.goto(route ? `./${route}/` : "./");
      expect(response.status()).toBe(200);
      const description = `${siteMetadata.description} ${info.description}`;
      const expectedTags = {
        'name="description"': description,
        'property="og:type"': "website",
        'property="og:site_name"': siteMetadata.name,
        'property="og:title"': info.title,
        'property="og:description"': description,
        'property="og:image:type"': "image/png",
        'property="og:image:width"': String(siteMetadata.imageWidth),
        'property="og:image:height"': String(siteMetadata.imageHeight),
        'property="og:image:alt"': siteMetadata.imageAlt,
        'name="twitter:card"': "summary_large_image",
        'name="twitter:title"': info.title,
        'name="twitter:description"': description,
        'name="twitter:image:alt"': siteMetadata.imageAlt,
      };
      // Social crawlers need complete metadata in the response before Angular boots.
      const staticTags = await page.evaluate(
        (html) => {
          const document = new DOMParser().parseFromString(html, "text/html");
          return Array.from(document.head.querySelectorAll("meta")).map(
            (tag) => ({
              name: tag.getAttribute("name"),
              property: tag.getAttribute("property"),
              content: tag.content,
            }),
          );
        },
        await response.text(),
      );
      for (const [selector, content] of Object.entries(expectedTags)) {
        const [attribute, value] = selector.split("=");
        expect(
          staticTags.filter((tag) => tag[attribute] === JSON.parse(value)),
        ).toEqual([expect.objectContaining({ content })]);
        await expect(page.locator(`head meta[${selector}]`)).toHaveAttribute(
          "content",
          content,
        );
      }
      const image = staticTags.find(
        (tag) => tag.property === "og:image",
      )?.content;
      expect(image).toBeTruthy();
      expect(image.endsWith(`/${siteMetadata.image}`)).toBe(true);
      expect(
        staticTags.find((tag) => tag.name === "twitter:image")?.content,
      ).toBe(image);
      if (!route) {
        // Fetch locally even when the build embeds the production site's absolute URL.
        const localImage = new URL(siteMetadata.image, page.url());
        localImage.hostname = "127.0.0.1";
        const imageResponse = await page.request.get(localImage.href);
        expect(imageResponse.status()).toBe(200);
        expect(imageResponse.headers()["content-type"]).toBe("image/png");
        const png = await imageResponse.body();
        expect(png.subarray(0, 8)).toEqual(
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        );
        expect(png.readUInt32BE(16)).toBe(1440);
        expect(png.readUInt32BE(20)).toBe(756);
      }
      await expect(page).toHaveTitle(info.title);
      const panels = page.locator("demo-panel");
      await expect(panels.first()).toBeVisible();
      const count = await panels.count();
      await expect(page.locator("wkly-runtime")).toHaveCount(count);
      await expect(page.locator("wkly-datetime-picker").first()).toBeVisible();
      for (let index = 0; index < count; index++)
        await expect(panels.nth(index).getByTestId("value")).not.toBeEmpty();
    });
  }
  // Verify component-driven updates during client navigation, including back to overview.
  for (const route of ["single", "ranges", ""]) {
    await page
      .locator('nav[aria-label="Showcase"] a')
      .nth(Object.keys(metadata).indexOf(route))
      .click();
    const info = metadata[route];
    await expect(page).toHaveTitle(info.title);
    for (const selector of ['property="og:title"', 'name="twitter:title"'])
      await expect(page.locator(`head meta[${selector}]`)).toHaveAttribute(
        "content",
        info.title,
      );
    for (const selector of [
      'name="description"',
      'property="og:description"',
      'name="twitter:description"',
    ])
      await expect(page.locator(`head meta[${selector}]`)).toHaveAttribute(
        "content",
        `${siteMetadata.description} ${info.description}`,
      );
  }
  expect(errors).toEqual([]);
});
