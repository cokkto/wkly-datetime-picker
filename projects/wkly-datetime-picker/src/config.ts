import { Directive, EventEmitter, InjectionToken, Input, Output } from '@angular/core';
import { AbsoluteWeek, WklyWeekOffset } from 'wkly-datetime-picker.core';
import { WklyCalendarAdapter, WklyCalendarDate, WklyDisabledDatePredicate, WklyDisabledTimePredicate, WklyHourCycle, WklyPickerValue, WklyRangeValidator, WklySelectionMode, WklyValidationError, WklyViewportPreset, WklyWeekLabelFormatter, WklyWeekLabelMode } from 'wkly-datetime-picker.adapters';
export type WklyCloseReason = 'submit' | 'auto-submit' | 'now' | 'close-button' | 'escape' | 'backdrop' | 'programmatic';
export interface WklyJumpOptions { readonly focus?: boolean; readonly select?: boolean; readonly align?: 'start' | 'center' | 'end'; }
export interface WklyViewportChange { readonly firstVisibleAbsoluteWeek: AbsoluteWeek; readonly lastVisibleAbsoluteWeek: AbsoluteWeek; readonly anchorAbsoluteWeek: AbsoluteWeek; }
export interface WklyClock { now(): Date; }
export const WKLY_CLOCK = new InjectionToken<WklyClock>('WKLY_CLOCK', { providedIn: 'root', factory: () => ({ now: () => new Date() }) });
export interface WklyConfiguration { readonly locale?: string; readonly weekOffset?: WklyWeekOffset; readonly initialEpochDay?: number; }
export const WKLY_CONFIG = new InjectionToken<WklyConfiguration>('WKLY_CONFIG', { providedIn: 'root', factory: () => ({}) });
export type WklyStrings = Readonly<Record<string, string>>;
export const WKLY_LOCALIZATION = new InjectionToken<WklyStrings>('WKLY_LOCALIZATION', { providedIn: 'root', factory: () => ({}) });
export const ENGLISH: WklyStrings = {
  manual: 'Manual date entry', calendar: 'Calendar view', now: 'Now', close: 'Close picker', confirm: 'Confirm', start: 'Start', end: 'End', day: 'Day', month: 'Month', year: 'Year', hour: 'Hour', minute: 'Minute', second: 'Second', previous: 'Previous week', next: 'Next week', am: 'AM', pm: 'PM',
  'malformed-iso': 'Enter a canonical UTC ISO value.', 'wrong-value-shape': 'The value does not match this selection mode.', incomplete: 'Complete all fields and both range endpoints.', 'invalid-calendar-date': 'This date does not exist. Correct the day, month or year.', 'unsupported-adapter-date': 'This date is outside the calendar’s supported range.', 'below-minimum': 'Choose a value on or after the minimum.', 'above-maximum': 'Choose a value on or before the maximum.', 'disabled-endpoint': 'This value is unavailable.', 'range-crosses-disabled': 'This range includes an unavailable value.', 'invalid-time': 'Enter a valid time.', 'step-mismatch': 'Use a value aligned with the configured step.', 'custom-validator': 'This selection is not allowed.', 'configuration-error': 'The picker configuration is invalid.'
};
export const TRANSLATIONS: Readonly<Record<string, WklyStrings>> = {
  ar: { manual: 'إدخال التاريخ يدويًا', calendar: 'التقويم', now: 'الآن', close: 'إغلاق', confirm: 'تأكيد', start: 'البداية', end: 'النهاية', day: 'اليوم', month: 'الشهر', year: 'السنة', hour: 'الساعة', minute: 'الدقيقة', second: 'الثانية', previous: 'الأسبوع السابق', next: 'الأسبوع التالي', am: 'ص', pm: 'م', incomplete: 'أكمل جميع الحقول.', 'invalid-calendar-date': 'هذا التاريخ غير صالح.', 'invalid-time': 'أدخل وقتًا صالحًا.', 'malformed-iso': 'أدخل قيمة UTC بصيغة ISO الصحيحة.', 'wrong-value-shape': 'القيمة لا تطابق وضع الاختيار.', 'unsupported-adapter-date': 'التاريخ خارج النطاق المدعوم.', 'below-minimum': 'القيمة أقل من الحد الأدنى.', 'above-maximum': 'القيمة تتجاوز الحد الأقصى.', 'disabled-endpoint': 'هذه القيمة غير متاحة.', 'range-crosses-disabled': 'يتضمن النطاق قيمة غير متاحة.', 'step-mismatch': 'اختر قيمة توافق الخطوة المحددة.', 'custom-validator': 'هذا الاختيار غير مسموح.', 'configuration-error': 'إعدادات المنتقي غير صالحة.' },
  he: { manual: 'הזנת תאריך ידנית', calendar: 'לוח שנה', now: 'עכשיו', close: 'סגירה', confirm: 'אישור', start: 'התחלה', end: 'סיום', day: 'יום', month: 'חודש', year: 'שנה', hour: 'שעה', minute: 'דקה', second: 'שנייה', previous: 'השבוע הקודם', next: 'השבוע הבא', am: 'לפנה״צ', pm: 'אחה״צ', incomplete: 'יש להשלים את כל השדות.', 'invalid-calendar-date': 'התאריך אינו תקין.', 'invalid-time': 'יש להזין שעה תקינה.', 'malformed-iso': 'יש להזין ערך UTC בתבנית ISO תקינה.', 'wrong-value-shape': 'מבנה הערך אינו מתאים למצב הבחירה.', 'unsupported-adapter-date': 'התאריך מחוץ לטווח הנתמך.', 'below-minimum': 'הערך קטן מהערך המזערי.', 'above-maximum': 'הערך גדול מהערך המרבי.', 'disabled-endpoint': 'הערך הזה אינו זמין.', 'range-crosses-disabled': 'הטווח כולל ערך שאינו זמין.', 'step-mismatch': 'יש לבחור ערך המתאים למרווח המוגדר.', 'custom-validator': 'הבחירה אינה מותרת.', 'configuration-error': 'הגדרות הבורר אינן תקינות.' }
};
export function coerceBoolean(value: unknown): boolean { return value !== null && value !== undefined && value !== false && value !== 'false'; }
/** Shared public inputs/outputs inherited by the picker and both trigger directives. */
@Directive()
export abstract class WklyPickerInputs {
  @Input() mode: WklySelectionMode = 'datetime';
  @Input() value: WklyPickerValue = null;
  @Input() calendarAdapter!: WklyCalendarAdapter;
  @Input() locale = '';
  @Input() weekOffset: WklyWeekOffset | null = null;
  @Input() viewportPreset: WklyViewportPreset = { kind: 'full-month' };
  @Input() hourCycle: WklyHourCycle = 'locale';
  @Input() showSeconds = false;
  @Input() minuteStep = 1;
  @Input() secondStep = 1;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() isDateDisabled: WklyDisabledDatePredicate | null = null;
  @Input() isTimeDisabled: WklyDisabledTimePredicate | null = null;
  @Input() rangeValidator: WklyRangeValidator | null = null;
  @Input() allowRangeAcrossDisabled = false;
  @Input() required = false;
  @Input() disabled = false;
  @Input() weekLabelMode: WklyWeekLabelMode = 'locale';
  @Input() weekLabelFormatter: WklyWeekLabelFormatter | null = null;
  @Input() weekCacheSize = 256;
  @Input() overscanWeeks = 3;
  @Input() ariaLabel: string | null = null;
  @Input() ariaDescribedBy: string | null = null;
  @Input() initialEpochDay: number | null = null;
  @Input() closeOnBackdrop = true;
  @Input() validators: readonly ((value: WklyPickerValue) => WklyValidationError | null)[] = [];
  @Output() valueChange = new EventEmitter<WklyPickerValue>();
  @Output() validationChange = new EventEmitter<readonly WklyValidationError[]>(true);
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<WklyCloseReason>();
  @Output() viewportChange = new EventEmitter<WklyViewportChange>(true);
  @Output() viewModeChange = new EventEmitter<'calendar' | 'manual'>();
}
export const INPUT_NAMES = ['mode', 'value', 'calendarAdapter', 'locale', 'weekOffset', 'viewportPreset', 'hourCycle', 'showSeconds', 'minuteStep', 'secondStep', 'min', 'max', 'isDateDisabled', 'isTimeDisabled', 'rangeValidator', 'allowRangeAcrossDisabled', 'required', 'disabled', 'weekLabelMode', 'weekLabelFormatter', 'weekCacheSize', 'overscanWeeks', 'ariaLabel', 'ariaDescribedBy', 'initialEpochDay', 'closeOnBackdrop', 'validators'];
