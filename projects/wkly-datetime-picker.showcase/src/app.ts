import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { registerLocaleData } from "@angular/common";
import enGB from "@angular/common/locales/en-GB";
import en from "@angular/common/locales/en";
import ar from "@angular/common/locales/ar";
import he from "@angular/common/locales/he";
import fi from "@angular/common/locales/fi";
import { DemoComponent } from "./demo.component";
import { PageComponent } from "./page.component";
import { AppComponent } from "./app.component";
import { PAGES } from "./pages";

// Register every locale offered in the showcase before a runtime is created.
registerLocaleData(enGB);
registerLocaleData(en, "en-US");
registerLocaleData(ar);
registerLocaleData(he, "he-IL");
registerLocaleData(fi, "fi-FI");

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
