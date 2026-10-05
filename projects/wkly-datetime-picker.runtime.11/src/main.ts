import "zone.js/dist/zone";
import "@angular/compiler";
import "reflect-metadata";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { RuntimeModule } from "./runtime.module";
import "./styles.css";

platformBrowserDynamic()
  .bootstrapModule(RuntimeModule)
  .catch((error) => console.error(error));
