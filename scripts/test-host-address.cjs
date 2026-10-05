function testHostURL(major, port = process.env.WKLY_TEST_PORT || "4318") {
  return `http://v${major}.wkly.localhost:${port}`;
}
module.exports = { testHostURL };
