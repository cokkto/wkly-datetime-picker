import { Component, NgModule, OnDestroy } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterModule,
} from "@angular/router";
import { registerLocaleData } from "@angular/common";
import enGB from "@angular/common/locales/en-GB";
import en from "@angular/common/locales/en";
import ar from "@angular/common/locales/ar";
import he from "@angular/common/locales/he";
import fi from "@angular/common/locales/fi";
import { WklyPickerValue } from "wkly-datetime-picker.adapters";
import {
  decodeIso,
  encodeIso,
  WklyGregorianCalendarAdapter,
} from "wkly-datetime-picker.adapters";
import { DemoComponent, DemoConfig } from "./demo.component";
import { ShowcaseHebrewCalendarAdapter } from "./hebrew-adapter";
import { RuntimeVersionService } from "./runtime-version.service";
import { PairedSelectionService } from "./paired-selection.service";
registerLocaleData(enGB);
registerLocaleData(en, "en-US");
registerLocaleData(ar);
registerLocaleData(he, "he-IL");
registerLocaleData(fi, "fi-FI");
export const PAGES: Record<
  string,
  { title: string; description: string; demos: DemoConfig[] }
> = {
  single: {
    title: "One moment, your way.",
    description:
      "Select a date, a time, or both. Every completed inline selection is available immediately as a canonical UTC value.",
    demos: [
      {
        id: "datetime",
        title: "Date & time",
        description:
          "A continuous calendar, paired with a precise time selector.",
        hourCycle: "switchable",
      },
      {
        id: "date",
        title: "Just the date",
        description: "Date-only values always resolve to midnight UTC.",
        mode: "date",
      },
      {
        id: "time",
        title: "Time, down to the second",
        description:
          "12-hour entry with seconds. The wire date is always 0000-01-01.",
        mode: "time",
        seconds: true,
        hourCycle: "h12",
      },
    ],
  },
  ranges: {
    title: "Make room for a range.",
    description:
      "Choose two endpoints in one calendar. Reverse selections are ordered automatically, and incomplete ranges stay in the draft.",
    demos: [
      {
        id: "datetime-range",
        title: "Date & time range",
        description:
          "Independent start and end times, with one shared calendar.",
        mode: "datetime-range",
      },
      {
        id: "date-range",
        title: "Date range",
        description:
          "Select a start and end across any month or year boundary.",
        mode: "date-range",
      },
      {
        id: "time-range",
        title: "Time range",
        description: "Two stacked time selectors. Equal endpoints are valid.",
        mode: "time-range",
      },
    ],
  },
  presentations: {
    title: "At home in any interface.",
    description:
      "The same picker, four ways to present it. Dialogs and overlays keep edits private until you confirm.",
    demos: [
      {
        id: "inline",
        title: "Inline",
        description: "Always visible. Valid actions commit immediately.",
        presentation: "inline",
      },
      {
        id: "dialog",
        title: "Native dialog",
        description: "Confirm to save. Close or Escape to discard the draft.",
        presentation: "dialog",
      },
      {
        id: "overlay",
        title: "Anchored overlay",
        description: "An optional CDK overlay connected to a plain input.",
        presentation: "overlay",
      },
      {
        id: "material",
        title: "Material host",
        description: "Material styles the input; WKLY provides the picker.",
        presentation: "material",
      },
    ],
  },
  localization: {
    title: "Local language. Shared time.",
    description:
      "Explore calendar systems, reading direction, localized digits, and regional week starts side by side.",
    demos: [
      {
        id: "hebrew",
        title: "עברית · Hebrew",
        description:
          "Hebrew calendar, variable month lists, and right-to-left layout.",
        locale: "he-IL",
        calendar: "hebrew",
      },
      {
        id: "arabic",
        title: "العربية · Arabic",
        description:
          "Gregorian dates with Arabic labels, digits, and locale week start.",
        locale: "ar",
      },
      {
        id: "us",
        title: "English · United States",
        description: "Sunday-first weeks and a 12-hour clock with AM/PM.",
        locale: "en-US",
        hourCycle: "h12",
      },
    ],
  },
  calendars: {
    title: "Two calendars. One day.",
    description:
      "Both representations share the same epoch day. Select either calendar to update its companion.",
    demos: [
      {
        id: "gregorian-pair",
        title: "Gregorian",
        description:
          "Public values always use the Gregorian UTC ISO wire format.",
        mode: "date",
        value: "2024-03-25T00:00:00.000Z",
      },
      {
        id: "hebrew-pair",
        title: "Hebrew",
        description:
          "A showcase-only adapter implementing the public calendar contract.",
        mode: "date",
        calendar: "hebrew",
        locale: "he-IL",
        value: "2024-03-25T00:00:00.000Z",
      },
    ],
  },
  validation: {
    title: "Keep the draft. Tell the truth.",
    description:
      "Impossible dates remain editable. Constraints apply equally to the calendar, typed fields, Now, and programmatic values.",
    demos: [
      {
        id: "constraints",
        title: "Constrained date & time",
        description:
          "December 2099–January 2100. Sundays and the noon hour are disabled.",
        validation: true,
      },
      {
        id: "range-constraints",
        title: "Disabled-range crossing",
        description:
          "A range cannot cross Sunday unless you explicitly allow it.",
        mode: "date-range",
        validation: true,
      },
      {
        id: "invalid-date",
        title: "An honest February 31",
        description:
          "Switch to manual entry and change January to February. Day 31 stays invalid.",
        mode: "date",
        value: "2100-01-31T00:00:00.000Z",
      },
      {
        id: "invalid-time",
        title: "Typed time & steps",
        description: "Try hour 24, or a minute outside the configured step.",
        mode: "time",
        hourCycle: "switchable",
      },
    ],
  },
  virtualization: {
    title: "Weeks without boundaries.",
    description:
      "Jump decades in one operation. The calendar only renders the visible weeks and a small overscan buffer.",
    demos: [
      {
        id: "virtual-month",
        title: "Full month",
        description:
          "Boundary-week days outside the anchor month are initially hidden.",
        preset: { kind: "full-month" },
        mode: "date",
      },
      {
        id: "virtual-around",
        title: "A little more context",
        description: "Boundary days plus one complete week on either side.",
        preset: {
          kind: "full-month-and-around",
          extraWeeksBefore: 1,
          extraWeeksAfter: 1,
        },
        mode: "date",
      },
      {
        id: "virtual-weeks",
        title: "Four weeks",
        description: "A compact, calendar-neutral viewport of four week rows.",
        preset: { kind: "weeks", visibleWeekCount: 4 },
        mode: "date",
      },
    ],
  },
  styling: {
    title: "A small, useful palette.",
    description:
      "CSS color tokens and a size multiplier fit the picker to your interface. Touch targets stay at least 44 pixels.",
    demos: [
      {
        id: "default-style",
        title: "Evergreen",
        description: "The default palette, with a clear current-day indicator.",
        mode: "date",
      },
      {
        id: "custom-style",
        title: "Indigo",
        description: "A custom accent color with a 1.15 size multiplier.",
        color: "#5146a5",
        size: 1.15,
        mode: "date",
      },
      {
        id: "dark-style",
        title: "Slate after dark",
        description:
          "Layered grays, blue selections, and warm constraint notices. Clear the range to see required validation.",
        theme: "dark",
        color: "#0e76b7",
        mode: "date-range",
        validation: true,
        value: ["1999-12-14T00:00:00.000Z", "2099-12-18T00:00:00.000Z"],
      },
      {
        id: "large-style",
        title: "More breathing room",
        description: "A 1.3 size multiplier with range selection.",
        color: "#854320",
        size: 1.3,
        mode: "date-range",
      },
    ],
  },
};
@Component({
  selector: "showcase-page",
  standalone: false,
  template: ` <ng-container *ngIf="page; else overview">
      <a class="back-link" routerLink="/">← Back to overview</a>
      <header class="page-heading">
        <span class="eyebrow">THE PLAYGROUND / {{ routeName }}</span>
        <h1>{{ page.title }}</h1>
        <p>{{ page.description }}</p>
      </header>
      <div *ngIf="routeName === 'calendars'" class="paired-examples">
        <button *ngFor="let example of pairs" (click)="choosePair(example.iso)">
          <strong>{{ example.iso.slice(0, 10) }}</strong
          ><span>{{ example.label }}</span
          ><small>Epoch day {{ example.day }}</small>
        </button>
      </div>
      <div class="demo-grid">
        <demo-panel
          *ngFor="let config of page.demos"
          [config]="config"
          (selection)="sync($event)"
          [class.full-row]="!!config.presentation && config.presentation !== 'inline'"
        ></demo-panel>
      </div>
    </ng-container>
    <ng-template #overview
      ><header class="hero">
        <span class="eyebrow">WKLY / ANGULAR DATE & TIME PICKER</span>
        <h1>A fresh perspective<br />on <em>time.</em></h1>
        <p>
          One continuous calendar. Any date, any time.<br />A week-based picker
          built to feel natural everywhere.
        </p>
        <div class="hero-actions">
          <a routerLink="/single" class="primary"
            >Explore the picker <span>↗</span></a
          ><a routerLink="/presentations">See presentations →</a>
        </div>
        <div class="feature-pills">
          <span>Angular runtimes</span><span>UTC by design</span
          ><span>Touch & keyboard</span>
        </div>
      </header>
      <div class="overview-layout">
        <div>
          <span class="eyebrow">EXPLORE THE POSSIBILITIES</span>
          <div class="feature-list">
            <a
              *ngFor="let route of routes; let i = index"
              [routerLink]="'/' + route"
              ><span class="feature-index">0{{ i + 1 }}</span>
              <div>
                <h2>{{ labels[route] }}</h2>
                <p>{{ summaries[route] }}</p>
              </div>
              <span>↗</span></a
            >
          </div>
        </div>
        <demo-panel [config]="heroDemo"></demo-panel>
      </div>
      <div class="package-note">
        WORKSPACE PACKAGES <code>core 0.1.0</code><code>adapters 0.1.0</code
        ><code>picker 0.1.0</code
        ><span
          >Showcase imports live library source through public entry
          points.</span
        >
      </div>
    </ng-template>`,
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
    calendars: "Gregorian and Hebrew, connected by a day.",
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
    return { iso, day, label: a.formatDate(a.epochDayToDate(day)) };
  });
  constructor(
    route: ActivatedRoute,
    private pairsService: PairedSelectionService,
  ) {
    this.routeName = route.snapshot.data.page || "";
    this.page = PAGES[this.routeName] || null;
  }
  sync(value: WklyPickerValue): void {
    if (this.routeName === "calendars" && typeof value === "string") {
      const date = decodeIso(value);
      const wire = encodeIso(date, "date");
      this.pairsService.select(wire);
    }
  }
  choosePair(value: string): void {
    this.pairsService.select(value);
  }
}
@Component({
  selector: "wkly-showcase",
  standalone: false,
  template: `<header class="app-header">
      <a routerLink="/" class="brand"
        ><span class="brand-mark">w.</span
        ><strong>wkly<span>datetime picker</span></strong></a
      ><span class="header-caption">A CONTINUOUS VIEW OF TIME</span
      ><button
        class="menu-toggle"
        (click)="menu = !menu"
        [attr.aria-expanded]="menu"
        aria-label="Toggle navigation"
      >
        ☰</button
      ><label class="version"
        ><span class="version-label">Angular runtime</span>
        <select
          [value]="versions.selected"
          (change)="selectVersion($event)"
          aria-label="Angular runtime version"
        >
          <option *ngFor="let major of versions.available" [value]="major">
            {{ major }}
          </option>
        </select>
      </label>
    </header>
    <div class="app-layout">
      <aside [class.mobile-open]="menu">
        <span class="nav-caption">PLAYGROUND</span>
        <nav aria-label="Showcase">
          <a
            routerLink="/"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: true }"
            #overview="routerLinkActive"
            [attr.aria-current]="overview.isActive ? 'page' : null"
            (click)="menu = false"
            >Overview</a
          ><a
            *ngFor="let route of routes"
            [routerLink]="'/' + route"
            routerLinkActive="active"
            #link="routerLinkActive"
            [attr.aria-current]="link.isActive ? 'page' : null"
            (click)="menu = false"
            >{{ labels[route] }}</a
          >
        </nav>
        <div class="sidebar-note">
          <span class="tiny-grid">▦</span><strong>Built around weeks.</strong>
          <p>
            Calendar-neutral at the core.<br />Human-friendly at the surface.
          </p>
          <span class="utc-label">UTC IN · UTC OUT</span>
        </div>
      </aside>
      <main>
        <router-outlet></router-outlet>
        <footer class="app-footer">
          <span>wkly · small details, better dates.</span
          ><span>Open source / MIT</span>
        </footer>
      </main>
    </div>`,
})
export class AppComponent {
  constructor(public versions: RuntimeVersionService) {}
  selectVersion(event: Event): void {
    this.versions.select((event.target as HTMLSelectElement).value);
  }
  menu = false;
  routes = Object.keys(PAGES);
  labels: Record<string, string> = {
    single: "Single selections",
    ranges: "Ranges",
    presentations: "Presentations",
    localization: "Localization",
    calendars: "Calendar adapters",
    validation: "Validation & forms",
    virtualization: "Virtual scrolling",
    styling: "Colors & sizing",
  };
}
@NgModule({
  declarations: [AppComponent, PageComponent, DemoComponent],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forRoot(
      [
        { path: "", component: PageComponent },
        ...Object.keys(PAGES).map((page) => ({
          path: page,
          component: PageComponent,
          data: { page },
        })),
        { path: "**", redirectTo: "" },
      ],
      { scrollPositionRestoration: "enabled" },
    ),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
