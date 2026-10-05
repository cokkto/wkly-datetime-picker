const supported = require("../supported-angular.json");
const available = Object.keys(supported).sort((a, b) => Number(a) - Number(b));
const majors = process.env.WKLY_TEST_ANGULAR
  ? process.env.WKLY_TEST_ANGULAR.split(",")
  : available;
if (
  !majors.length ||
  new Set(majors).size !== majors.length ||
  majors.some((major) => !available.includes(major))
)
  throw new Error(
    "WKLY_TEST_ANGULAR must contain distinct supported Angular majors",
  );
module.exports = { majors };
