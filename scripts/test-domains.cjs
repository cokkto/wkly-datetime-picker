// Each implemented domain is one browser/context lifetime per selected Angular major.
const domains = [
  {
    id: "touch",
    timezoneId: "America/New_York",
    device: { hasTouch: true, isMobile: true, deviceScaleFactor: 2 },
    suites: {
      calendar: { width: 390, height: 844 },
      fields: { width: 390, height: 844 },
      scrolling: { width: 390, height: 844 },
    },
  },
  {
    id: "layout",
    timezoneId: "America/New_York",
    suites: {
      narrow: { width: 320, height: 1000 },
      tablet: { width: 768, height: 1000 },
      desktop: { width: 1280, height: 1000 },
      "zoom-out": { width: 1280, height: 1000, zoom: 0.8 },
      "zoom-125": { width: 768, height: 1000, zoom: 1.25 },
      "zoom-150": { width: 768, height: 1000, zoom: 1.5 },
    },
  },
  {
    id: "calendars-configuration",
    timezoneId: "America/New_York",
    suites: {
      calendars: { width: 1280, height: 900 },
      localization: { width: 1280, height: 900 },
      configuration: { width: 1280, height: 900 },
      paired: { width: 1280, height: 900 },
    },
  },
  {
    id: "presentations",
    timezoneId: "America/New_York",
    suites: {
      native: { width: 1280, height: 900 },
      cdk: { width: 1280, height: 900 },
      material: { width: 1280, height: 900 },
    },
  },
  {
    id: "navigation",
    timezoneId: "America/New_York",
    suites: {
      navigation: { width: 1280, height: 900 },
      scrolling: { width: 1280, height: 900 },
      "scrolling-narrow": { width: 420, height: 900, zoom: 1.25 },
    },
  },
  {
    id: "selection-editing",
    timezoneId: "America/New_York",
    suites: {
      calendar: { width: 1280, height: 900 },
      manual: { width: 1280, height: 900 },
      time: { width: 1280, height: 900 },
    },
  },
  {
    id: "values-forms",
    timezoneId: "America/New_York",
    suites: {
      values: { width: 1280, height: 900 },
      forms: { width: 1280, height: 900 },
    },
  },
];
module.exports = { domains };
