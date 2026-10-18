const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { angularPlugin } = require("./angular-build.cjs");

for (const major of [11, 22]) {
  const ts = require(
    major === 11
      ? "typescript"
      : "../projects/wkly-datetime-picker.runtime.22/node_modules/typescript",
  );
  test(`Angular ${major} resource discovery preserves samples and tracks real resources`, () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "wkly-resources-"));
    try {
      const entry = path.join(directory, "entry.ts");
      const config = path.join(directory, "tsconfig.json");
      fs.writeFileSync(
        path.join(directory, "core.d.ts"),
        "export declare function Component(metadata: any): ClassDecorator;",
      );
      fs.writeFileSync(
        config,
        JSON.stringify({
          compilerOptions: {
            target: "es2018",
            module: "commonjs",
            experimentalDecorators: true,
            ...(major === 22 ? { ignoreDeprecations: "6.0" } : {}),
            types: [],
            baseUrl: directory,
            paths: { "@angular/core": ["core.d.ts"] },
          },
          files: ["entry.ts"],
        }),
      );
      const sample = `@Component({templateUrl: './booking.component.html', styleUrls: ['./missing.css']})`;
      const source = `
        import { Component as View } from '@angular/core';
        import * as ng from '@angular/core';
        // templateUrl: './comment.html', styleUrls: ['./comment.css']
        export const sample = ${JSON.stringify(sample)};
        export const multiline = \`@Component({
          templateUrl: './multiline.html',
          styleUrls: ['./multiline.css']
        })\`;
        export const unrelated = {templateUrl: './unrelated.html', styleUrls: ['./unrelated.css']};
        @View({
          'templateUrl':
            './actual.html',
          styleUrls: [
            './first.css',
            './second.css',
          ],
        })
        export class First {}
        @ng.Component({templateUrl: './actual.html'})
        export class Second {}
      `;
      fs.writeFileSync(entry, source);
      const template = `<p title="quoted">Template with \`backticks\`, \\slashes and \nnewlines</p>`;
      fs.writeFileSync(path.join(directory, "actual.html"), template);
      fs.writeFileSync(path.join(directory, "first.css"), "p { color: red; }");
      fs.writeFileSync(
        path.join(directory, "second.css"),
        "p { color: blue; }",
      );
      let start;
      let load;
      angularPlugin(ts, config, undefined, major).setup({
        onStart(callback) {
          start = callback;
        },
        onLoad(_options, callback) {
          load = callback;
        },
      });
      const compile = () => {
        start();
        const result = load({ path: entry });
        const exports = {};
        vm.runInNewContext(result.contents, {
          exports,
          require: () => ({
            Component: (metadata) => (target) => {
              target.metadata = metadata;
            },
          }),
        });
        return { ...result, exports };
      };
      const result = compile();
      assert.equal(result.exports.sample, sample);
      assert.match(
        result.exports.multiline,
        /templateUrl: '.\/multiline.html'/,
      );
      assert.equal(result.exports.unrelated.templateUrl, "./unrelated.html");
      assert.equal(result.exports.First.metadata.template, template);
      assert.equal(result.exports.Second.metadata.template, template);
      assert.deepEqual(Array.from(result.exports.First.metadata.styles), [
        "p { color: red; }",
        "p { color: blue; }",
      ]);
      assert.deepEqual(
        new Set(result.watchFiles),
        new Set([
          entry,
          ...["actual.html", "first.css", "second.css"].map((file) =>
            path.join(directory, file),
          ),
        ]),
      );

      // Rebuilds reread resources and stop watching references removed from metadata.
      fs.writeFileSync(path.join(directory, "actual.html"), "<p>Changed</p>");
      fs.writeFileSync(entry, source.replace(/'\.\/second.css',/, ""));
      const rebuilt = compile();
      assert.equal(rebuilt.exports.First.metadata.template, "<p>Changed</p>");
      assert.ok(
        !rebuilt.watchFiles.includes(path.join(directory, "second.css")),
      );

      fs.unlinkSync(path.join(directory, "actual.html"));
      assert.throws(start, /ENOENT.*actual\.html/);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
}
