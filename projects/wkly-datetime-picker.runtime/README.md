# Shared showcase runtime

This private workspace project holds the plain data protocol between the showcase host and its Angular 11, 13–15, and 18–22 iframes. Its source is imported directly by those applications; it does not ship as a picker package.

Keep Angular components, forms, and version-specific imports in each runtime project. The calendar-neutral week arithmetic stays in `wkly-datetime-picker.core`. Shared row construction and draft validation live in `wkly-datetime-picker` because they depend on calendar adapter interfaces.
