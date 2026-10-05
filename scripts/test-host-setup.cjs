const http = require("node:http");
const { testHostURL } = require("./test-host-address.cjs");

function readHost(url, loopback) {
  return new Promise((resolve, reject) => {
    // Browsers resolve .localhost themselves; Node's OS resolver may not.
    // Use the same virtual host while connecting directly to loopback.
    const request = http.get(
      `${loopback}${url.pathname}`,
      {
        headers: { host: url.host },
        timeout: 5000,
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () =>
          resolve({ status: response.statusCode, body }),
        );
        response.on("error", reject);
      },
    );
    request.on("timeout", () =>
      request.destroy(new Error("Host check timed out after 5000ms")),
    );
    request.on("error", reject);
  });
}

async function checkTestHosts(baseURL, majors) {
  // /health only proves that a process is listening. Check the selected hosts
  // before any workers start so a stale server cannot cause thousands of waits.
  const failures = (
    await Promise.all(
      majors.map(async (major) => {
        const url = new URL(
          "/index.html",
          testHostURL(major, new URL(baseURL).port),
        );
        try {
          const response = await readHost(url, baseURL);
          if (response.status !== 200) return `${url}: HTTP ${response.status}`;
          if (!response.body.includes("<test-host>"))
            return `${url}: not a picker test host`;
          return null;
        } catch (error) {
          return `${url}: ${error.message}`;
        }
      }),
    )
  ).filter(Boolean);
  if (failures.length)
    throw new Error(
      `Picker test server is missing selected Angular hosts:\n${failures.join("\n")}\n` +
        "Stop the existing test-host server and rerun, or set WKLY_TEST_PORT to an unused port. " +
        "Run npm run test:picker to rebuild selected hosts.",
    );
}
module.exports = async (config) => {
  const majors = [
    ...new Set(config.projects.map((project) => project.metadata.angular)),
  ];
  await checkTestHosts(
    `http://127.0.0.1:${process.env.WKLY_TEST_PORT || "4318"}`,
    majors,
  );
};
module.exports.checkTestHosts = checkTestHosts;
