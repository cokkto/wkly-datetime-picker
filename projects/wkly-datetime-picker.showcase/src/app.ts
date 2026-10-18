import { NgModule } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { RuntimeModule } from "../../wkly-datetime-picker.runtime.22/src/runtime.module";
import { PageComponent } from "./page.component";
import { AppComponent } from "./app.component";
import { PAGES } from "./pages";
import {
  OverviewDescriptionComponent,
  OverviewIntroductionComponent,
} from "./overview-description.component";

@NgModule({
  declarations: [
    AppComponent,
    PageComponent,
    OverviewDescriptionComponent,
    OverviewIntroductionComponent,
  ],
  imports: [
    BrowserModule,
    RuntimeModule,
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
