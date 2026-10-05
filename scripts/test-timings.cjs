const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");

function createTimings(file, metadata = {}) {
  const started = performance.now();
  const report = {
    ...metadata,
    startTime: new Date().toISOString(),
    steps: [],
    totalMs: 0,
    passed: false,
  };
  const save = () => {
    report.totalMs = performance.now() - started;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2));
  };
  save();
  return {
    measure(name, action) {
      const start = performance.now();
      const step = { name, durationMs: 0, passed: false };
      try {
        const result = action();
        step.passed = true;
        return result;
      } finally {
        step.durationMs = performance.now() - start;
        report.steps.push(step);
        // Persist every completed step so failed runs retain their evidence.
        save();
        console.log(
          `${name}: ${(step.durationMs / 1000).toFixed(2)}s (${step.passed ? "PASS" : "FAIL"})`,
        );
      }
    },
    complete() {
      report.passed = true;
      save();
    },
  };
}

module.exports = { createTimings };
