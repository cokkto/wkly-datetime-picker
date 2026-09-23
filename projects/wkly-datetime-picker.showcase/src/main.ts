import 'zone.js/dist/zone';
import '@angular/compiler';
import 'reflect-metadata';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app';
import './styles.css';
platformBrowserDynamic().bootstrapModule(AppModule).catch(error => console.error(error));
