const { createCheckPlan, runCheck } = require("./test-check.cjs");
// Keep the full-gate alias while profiles provide explicit daily commands.
runCheck(createCheckPlan("release", process.env, process.argv.slice(2)));
