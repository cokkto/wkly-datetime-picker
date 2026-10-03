import "zone.js";
import "@angular/compiler";
import "reflect-metadata";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { AppModule } from "./app";
import "@angular/cdk/overlay-prebuilt.css";
import "@angular/material/prebuilt-themes/indigo-pink.css";
import "../../wkly-datetime-picker.runtime/src/picker-host.css";
import "./styles.css";
platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((error) => console.error(error));
