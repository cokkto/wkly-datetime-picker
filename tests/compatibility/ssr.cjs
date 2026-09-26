// Run in the installed consumer, never against source aliases or workspace links.
const assert = require('assert').strict;
const Module = require('module');
const original = Module._load;
Module._load = function (name) {
  if (name.startsWith('@angular/') || name === 'rxjs') throw new Error('Framework dependency in shared package: ' + name);
  return original.apply(this, arguments);
};
for (const name of ['wkly-datetime-picker.core', 'wkly-datetime-picker.adapters', 'wkly-datetime-picker']) assert(Object.keys(require(name)).length);
Module._load = original;
const load = async name => { const value = await import(name); return { ...value.default, ...value }; };
(async () => {
  try { require('zone.js/node'); } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND' && error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    require('zone.js/dist/zone-node');
  }
  await load('@angular/compiler');
  const { Component, NgModule } = await load('@angular/core');
  const { BrowserModule } = await load('@angular/platform-browser');
  const { ServerModule, renderModule } = await load('@angular/platform-server');
  const base = await load(process.argv[2]);
  assert(base.WklyDateTimePickerComponent);
  class Host {}
  Component({ selector: 'server-host', standalone: false, template: '<wkly-datetime-picker mode="date" value="1969-12-31T00:00:00.000Z"></wkly-datetime-picker>' })(Host);
  class App {}
  NgModule({
    imports: [BrowserModule.withServerTransition ? BrowserModule.withServerTransition({ appId: 'wkly-ssr' }) : BrowserModule, ServerModule, base.WklyDateTimePickerModule],
    declarations: [Host], bootstrap: [Host],
    providers: [{ provide: base.WKLY_CLOCK, useValue: { now: () => { throw new Error('SSR must not read the clock'); } } }],
  })(App);
  const html = await renderModule(App, { document: '<html><body><server-host></server-host></body></html>', url: '/' });
  assert(html.includes('1969'));
  assert(html.includes('role="grid"'));
  console.log('PASS packed shared imports and Angular server rendering without clock access');
})().catch(error => { console.error(error); process.exitCode = 1; });
