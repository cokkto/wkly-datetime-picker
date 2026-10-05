const path = require("path");
require(
  path.join(
    path.dirname(require.resolve("@playwright/test/package.json")),
    "cli.js",
  ),
);
