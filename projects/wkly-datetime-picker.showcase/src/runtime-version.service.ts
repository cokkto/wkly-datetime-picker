import { Injectable } from "@angular/core";
declare const WKLY_RUNTIME_VERSIONS: readonly string[];
@Injectable({ providedIn: "root" })
export class RuntimeVersionService {
  readonly available = [...WKLY_RUNTIME_VERSIONS].sort(
    (a, b) => Number(b) - Number(a),
  );
  url(major: string, route = "/"): string {
    const url = new URL(window.location.href);
    const domain = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      ? "wkly.localhost"
      : url.hostname;
    url.hostname = `v${major}.${domain}`;
    url.pathname = route;
    url.search = "";
    url.hash = "";
    return url.href;
  }
  select(major: string): void {
    if (this.available.includes(major)) window.location.assign(this.url(major));
  }
}
