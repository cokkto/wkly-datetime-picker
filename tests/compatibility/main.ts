import 'zone.js';
import { Component, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { WklyDateTimePickerModule } from '__PACKAGE__';
import { WklyGregorianCalendarAdapter } from 'wkly-datetime-picker.adapters';
import { absoluteWeekOf } from 'wkly-datetime-picker.core';
import { ENGLISH } from 'wkly-datetime-picker';

@Component({
  /* COMPONENT_OPTIONS */
  selector: 'compat-app',
  template: `
    <h1>{{ title }}</h1>
    <wkly-datetime-picker mode="date" [formControl]="date" [calendarAdapter]="adapter"></wkly-datetime-picker>
    <output id="value">{{ date.value }}</output>
    <output id="valid">{{ date.valid }}</output>
    <button id="reset" (click)="date.setValue('2020-02-20T00:00:00.000Z')">Reset from form</button>
    <button id="disable" (click)="date.disable()">Disable from form</button>
  `,
})
export class App {
  title = ENGLISH.confirm + ' / week ' + absoluteWeekOf(0);
  adapter = new WklyGregorianCalendarAdapter('en-GB');
  date = new FormControl('2020-02-15T00:00:00.000Z');
}

@NgModule({ imports: [BrowserModule, ReactiveFormsModule, WklyDateTimePickerModule], declarations: [App], bootstrap: [App] })
export class AppModule {}

platformBrowserDynamic().bootstrapModule(AppModule).catch(error => { console.error(error); throw error; });
