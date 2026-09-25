const assert = require('assert').strict;
const Module = require('module');
const original = Module._load;
Module._load = function (request, parent, main) {
  if (request.startsWith('@angular/') || request === 'rxjs') throw new Error('Shared package attempted to resolve Angular or RxJS');
  return original.apply(this, arguments);
};
assert.equal(typeof global.window, 'undefined');
assert.equal(typeof global.document, 'undefined');
require('../dist/wkly-datetime-picker.core');
require('../dist/wkly-datetime-picker.adapters');
const shared = require('../dist/wkly-datetime-picker');
assert(shared.ENGLISH);
Module._load = function (request, parent, main) {
  if (request.startsWith('@angular/cdk')) throw new Error('Base package attempted to resolve CDK');
  return original.apply(this, arguments);
};
const base = require('../dist/wkly-datetime-picker.11');
assert(base.WklyDateTimePickerComponent);
Module._load = original;
require('../dist/wkly-datetime-picker.11/cdk-overlay');
console.log('PASS Node SSR imports of every public entry point; base import with CDK resolution blocked');
require('zone.js/dist/zone-node');
require('reflect-metadata');
require('@angular/compiler');
const { Component, NgModule } = require('@angular/core');
const { BrowserModule } = require('@angular/platform-browser');
const { ServerModule, renderModule } = require('@angular/platform-server');
class ServerHost {}
Component({ selector: 'server-host', template: '<wkly-datetime-picker mode="date" value="1969-12-31T00:00:00.000Z"></wkly-datetime-picker>' })(ServerHost);
class ServerApp {}
NgModule({ imports: [BrowserModule.withServerTransition({ appId: 'wkly-ssr' }), ServerModule, base.WklyDateTimePickerModule], declarations: [ServerHost], bootstrap: [ServerHost], providers: [{ provide: base.WKLY_CLOCK, useValue: { now: () => { throw new Error('SSR must not read the clock'); } } }] })(ServerApp);
renderModule(ServerApp, { document: '<html><body><server-host></server-host></body></html>', url: '/' }).then(html => { assert(html.includes('1969')); assert(html.includes('role="grid"')); console.log('PASS Angular 11 server rendering without clock access'); }).catch(error => { console.error(error); process.exitCode = 1; });
