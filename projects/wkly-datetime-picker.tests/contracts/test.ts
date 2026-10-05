// The workspace retains Node 14 declarations for Angular 11's compiler.
// Type only the native runner API used here without changing legacy toolchains.
export const test: (
  name: string,
  action: () => void | Promise<void>,
) => Promise<void> = require("node:test").test;
