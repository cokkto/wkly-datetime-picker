const available = ["chromium", "firefox", "webkit"];
const browsers = process.env.WKLY_TEST_BROWSERS
  ? process.env.WKLY_TEST_BROWSERS.split(",")
  : available;
if (
  !browsers.length ||
  new Set(browsers).size !== browsers.length ||
  browsers.some((name) => !available.includes(name))
)
  throw new Error(
    "WKLY_TEST_BROWSERS must contain distinct chromium,firefox,webkit names",
  );
// Real drag input uses Chromium CDP; Firefox/WebKit do not expose this API.
const supports = (browser, domain) =>
  domain.id !== "touch" || browser === "chromium";
module.exports = { browsers, supports };
