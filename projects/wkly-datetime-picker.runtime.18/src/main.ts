import "zone.js";
import "@angular/compiler";
import "reflect-metadata";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { RuntimeModule } from "./runtime.module";
import "./styles.css";

platformBrowserDynamic()
  .bootstrapModule(RuntimeModule)
  .then(() =>
    window.parent.postMessage({ type: "wkly:ready" }, window.location.origin),
  )
  .catch((error) =>
    window.parent.postMessage(
      { type: "wkly:error", payload: String(error) },
      window.location.origin,
    ),
  );
