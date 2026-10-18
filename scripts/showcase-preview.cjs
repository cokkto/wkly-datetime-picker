const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const { createShowcaseServer } = require("./showcase-server.cjs");
const siteMetadata = require("../projects/wkly-datetime-picker.showcase/src/site-metadata.json");
const root = path.resolve(__dirname, "..");

async function main() {
  const basePath = process.env.WKLY_BASE_PATH || "/";
  const server = createShowcaseServer({
    output: path.resolve(root, process.env.WKLY_OUTPUT || "dist/showcase"),
    basePath,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let browser;
  try {
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: {
        width: siteMetadata.imageWidth,
        height: siteMetadata.imageHeight,
      },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await page.goto(
      `http://127.0.0.1:${server.address().port}${basePath}single/`,
    );
    const demo = page.getByTestId("date");
    await demo.locator("wkly-datetime-picker").waitFor();
    // Set a stable selection through the showcase's public configuration controls.
    await demo.getByText("Configure this example", { exact: true }).click();
    await demo
      .getByLabel("Programmatic UTC value")
      .fill("2026-10-18T00:00:00.000Z");
    await demo
      .getByRole("button", { name: "Apply value", exact: true })
      .click();
    await demo.getByText("Configure this example", { exact: true }).click();
    await page.evaluate(() => {
      const stage = document.querySelector(
        '[data-testid="date"] .picker-stage',
      );
      const brand = document.querySelector(".brand-mark").cloneNode(true);
      const scroller = stage.querySelector(".week-scroll");
      stage.dataset.previewScroll = String(scroller.scrollTop);
      const preview = document.createElement("div");
      preview.className = "social-preview";
      preview.innerHTML = `
        <div class="preview-copy">
          <div class="preview-brand"><h1>WKLY</h1></div>
          <p class="preview-product">date time<br><em>picker</em></p>
          <p class="preview-tagline">A continuous<br>view of time.</p>
        </div>
        <div class="preview-calendar"></div>`;
      preview.querySelector(".preview-brand").prepend(brand);
      // Use the live compiled calendar, preserving its labels, grid, and selection.
      preview.querySelector(".preview-calendar").append(stage);
      document.querySelector("wkly-showcase").style.display = "none";
      document.body.append(preview);
    });
    await page.addStyleTag({
      content: `
      body { overflow: hidden; }
      .social-preview { width: 1440px; height: 756px; padding: 64px;
        display: grid; grid-template-columns: 552px 712px; gap: 48px;
        background: radial-gradient(ellipse at 85% 45%, #e3ede2 0, #f7f8f5 60%); }
      .preview-copy { display: flex; flex-direction: column; align-items: flex-start; justify-content: center; }
      .preview-brand { display: flex; align-items: center; gap: 24px; }
      .preview-brand .brand-mark { width: 128px; height: 128px; border-radius: 32px;
        font-size: 90px; letter-spacing: -9px; padding-right: 12px; }
      .preview-brand h1 { font-size: 108px; line-height: 1; letter-spacing: -6px;
        font-weight: 650; margin: 0; }
      .preview-product { font-size: 80px; line-height: 1.08; letter-spacing: -3px;
        font-weight: 500; margin: 36px 0 0; }
      .preview-product em { font-family: Georgia, serif; color: #176c55; font-weight: 400; }
      .preview-tagline { font-size: 38px; line-height: 1.3; color: #617167; margin: 36px 0 0; }
      .preview-calendar { align-self: center; background: #fff; border: 1px solid #dce4da;
        border-radius: 24px; box-shadow: 0 20px 60px #17382712; overflow: hidden; }
      .preview-calendar .picker-stage { padding: 14px; zoom: 1.4; }
    `,
    });
    await page.evaluate(() => document.fonts.ready);
    // Moving a scroll container can reset its position; keep the virtual rows in view.
    await page.locator(".preview-calendar .picker-stage").evaluate((stage) => {
      stage.querySelector(".week-scroll").scrollTop = Number(
        stage.dataset.previewScroll,
      );
    });
    await page
      .locator(".preview-calendar .day.selected")
      .scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    const target = path.join(
      root,
      "projects/wkly-datetime-picker.showcase/src",
      siteMetadata.image,
    );
    fs.mkdirSync(path.dirname(target), { recursive: true });
    await page.screenshot({ path: target });
    console.log(
      `Captured ${siteMetadata.imageWidth} × ${siteMetadata.imageHeight} preview: ${target}`,
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
