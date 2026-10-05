function showcaseProgressPlugin(label, log = console.log) {
  return {
    name: "showcase-progress",
    setup(build) {
      let started;
      let rebuilding = false;
      build.onStart(() => {
        started = Date.now();
        log(`WKLY [${label}]: ${rebuilding ? "Rebuilding" : "Building"}...`);
      });
      build.onEnd((result) => {
        const action = rebuilding ? "Rebuild" : "Build";
        if (result.errors.length) {
          log(
            `WKLY [${label}]: ${action} failed with ${result.errors.length} error(s).`,
          );
        } else {
          log(
            `WKLY [${label}]: ${rebuilding ? "Rebuilt" : "Built"} in ${Date.now() - started}ms. Refresh the browser.`,
          );
        }
        rebuilding = true;
      });
    },
  };
}

module.exports = { showcaseProgressPlugin };
