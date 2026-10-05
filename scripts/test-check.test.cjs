const assert = require("node:assert/strict");
const test = require("node:test");
const { createCheckPlan } = require("./test-check.cjs");
const majors = Object.keys(require("../supported-angular.json")).sort(
  (a, b) => Number(a) - Number(b),
);

test("development defaults to the newest version and Chromium, and permits a focused override", () => {
  const plan = createCheckPlan("dev", {});
  assert.equal(plan.env.WKLY_TEST_ANGULAR, majors.at(-1));
  assert.equal(plan.env.WKLY_TEST_BROWSERS, "chromium");
  assert.deepEqual(
    plan.stages.map((stage) => stage.name),
    ["Source contracts", "Picker host builds", "Picker domains"],
  );
  assert.equal(
    createCheckPlan("dev", { WKLY_TEST_ANGULAR: "11" }).env.WKLY_TEST_ANGULAR,
    "11",
  );
  assert.throws(() => createCheckPlan("dev", { WKLY_TEST_ANGULAR: "999" }));
  assert.throws(() =>
    createCheckPlan("dev", { WKLY_TEST_BROWSERS: "chromium,chromium" }),
  );
});

test("push adds static checks and both supported endpoints without package builds", () => {
  const plan = createCheckPlan("push", {
    WKLY_TEST_ANGULAR: "17",
    WKLY_TEST_BROWSERS: "webkit",
  });
  assert.equal(plan.env.WKLY_TEST_ANGULAR, `${majors[0]},${majors.at(-1)}`);
  assert.equal(plan.env.WKLY_TEST_BROWSERS, "chromium");
  assert.ok(plan.stages.some((stage) => stage.name === "Lint"));
  assert.ok(!plan.stages.some((stage) => /package|Showcase/.test(stage.name)));
});

test("PR and release cannot silently inherit a reduced matrix", () => {
  for (const profile of ["pr", "release"]) {
    const plan = createCheckPlan(profile, {
      WKLY_TEST_ANGULAR: "22",
      WKLY_TEST_BROWSERS: "chromium",
      WKLY_TEST_PREBUILT: "1",
    });
    assert.equal(plan.env.WKLY_TEST_ANGULAR, majors.join(","));
    assert.equal(plan.env.WKLY_TEST_BROWSERS, "chromium,firefox,webkit");
    assert.ok(plan.stages.some((stage) => stage.name === "Picker host builds"));
    assert.ok(plan.stages.some((stage) => stage.name === "Showcase browsers"));
    const packed = plan.stages.find(
      (stage) => stage.name === "Angular package qualification",
    );
    if (profile === "release")
      assert.deepEqual(packed.args, ["scripts/test-packed.cjs", "--fresh"]);
    else assert.equal(packed, undefined);
  }
});

test("reuse is explicit and never described as fresh release qualification", () => {
  const plan = createCheckPlan("release", {}, ["--reuse-packed"]);
  assert.match(plan.packedArtifacts, /not fresh/);
  assert.deepEqual(
    plan.stages.find((stage) => stage.name === "Angular package qualification")
      .args,
    ["scripts/test-packed.cjs"],
  );
  assert.throws(() => createCheckPlan("push", {}, ["--reuse-packed"]));
  assert.throws(() => createCheckPlan("release", {}, ["--unknown"]));
});
