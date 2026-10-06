import { DOCUMENT } from "@angular/common";
import { Title, Meta } from "@angular/platform-browser";
import metadata from "./page-metadata.json";
import { Component, Inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { decodeIso } from "wkly-datetime-picker.adapters";
import { DemoConfig } from "./demo.component";
import { ShowcaseHebrewCalendarAdapter } from "./hebrew-adapter";
import { PairedSelectionService } from "./paired-selection.service";
import { ShowcaseHijriCalendarAdapter } from "./hijri-adapter";
import { PAGES } from "./pages";

@Component({
  selector: "showcase-page",
  standalone: false,
  templateUrl: "./page.component.html",
})
export class PageComponent {
  routeName: string;
  page: (typeof PAGES)[string] | null;
  routes = Object.keys(PAGES);
  labels: Record<string, string> = {
    single: "Single selections",
    ranges: "Date & time ranges",
    presentations: "Presentations",
    localization: "Localization",
    calendars: "Calendar adapters",
    validation: "Validation & forms",
    virtualization: "Virtual scrolling",
    styling: "Colors & sizing",
  };
  summaries: Record<string, string> = {
    single: "Date, time, or the whole moment.",
    ranges: "Two endpoints. One clear selection.",
    presentations: "Inline, dialog, overlay, and Material.",
    localization: "Regional formats and right-to-left layouts.",
    calendars: "Gregorian, Hebrew, and Hijri, connected by a day.",
    validation: "Clear constraints. No silent corrections.",
    virtualization: "Explore decades with a bounded viewport.",
    styling: "Make it feel like part of your product.",
  };
  heroDemo: DemoConfig = {
    id: "hero-picker",
    title: "Try a moment",
    description: "Choose a day. Scroll through weeks. Make it yours.",
    hourCycle: "switchable",
  };
  pairs = [
    "1969-12-31T00:00:00.000Z",
    "2024-03-25T00:00:00.000Z",
    "2099-12-16T00:00:00.000Z",
  ].map((iso) => {
    const day = decodeIso(iso).epochDay,
      a = new ShowcaseHebrewCalendarAdapter("en-US");
    const h = new ShowcaseHijriCalendarAdapter("en-US");
    return {
      iso,
      day,
      label:
        a.formatDate(a.epochDayToDate(day)) +
        " · " +
        h.formatDate(h.epochDayToDate(day)),
    };
  });
  constructor(
    route: ActivatedRoute,
    private pairsService: PairedSelectionService,
    title: Title,
    meta: Meta,
    @Inject(DOCUMENT) document: Document,
  ) {
    this.routeName = route.snapshot.data.page || "";
    this.page = PAGES[this.routeName] || null;
    const pageMetadata =
      metadata[this.routeName as keyof typeof metadata] || metadata[""];
    title.setTitle(pageMetadata.title);
    meta.updateTag({ name: "description", content: pageMetadata.description });
    meta.updateTag({ property: "og:title", content: pageMetadata.title });
    meta.updateTag({
      property: "og:description",
      content: pageMetadata.description,
    });
    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (canonical) {
      const url = new URL(
        this.routeName ? this.routeName + "/" : "",
        document.baseURI,
      ).href;
      canonical.href = url;
      meta.updateTag({ property: "og:url", content: url });
    }
  }
  choosePair(value: string): void {
    this.pairsService.select(value);
  }
}
