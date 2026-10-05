import "zone.js";
import "@angular/compiler";
import "reflect-metadata";
// Load the JIT facade before evaluating partially compiled Angular chunks.
import("./bootstrap").catch((error) => console.error(error));
