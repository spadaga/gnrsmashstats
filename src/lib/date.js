// Local (browser-timezone) calendar date as YYYY-MM-DD.
// `new Date().toISOString().slice(0, 10)` returns the UTC calendar date, which
// is a day behind local time for the first few hours of each day in timezones
// ahead of UTC (e.g. IST, UTC+5:30 — UTC is still "yesterday" until 05:30 IST).
export function localISODate(d = new Date()) {
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

export const DAYS_OF_WEEK = [
  { key: "sun", dayIndex: 0, dayName: "Sunday", shortDay: "Sun" },
  { key: "mon", dayIndex: 1, dayName: "Monday", shortDay: "Mon" },
  { key: "tue", dayIndex: 2, dayName: "Tuesday", shortDay: "Tue" },
  { key: "wed", dayIndex: 3, dayName: "Wednesday", shortDay: "Wed" },
  { key: "thu", dayIndex: 4, dayName: "Thursday", shortDay: "Thu" },
  { key: "fri", dayIndex: 5, dayName: "Friday", shortDay: "Fri" },
  { key: "sat", dayIndex: 6, dayName: "Saturday", shortDay: "Sat" },
];

export function getCurrentWeekDates(refDate = new Date()) {
  const now = new Date(refDate);
  const todayStr = localISODate(now);
  const currentDayOfWeek = now.getDay();

  const sunday = new Date(now);
  sunday.setDate(now.getDate() - currentDayOfWeek);

  return DAYS_OF_WEEK.map((d, index) => {
    const dayDate = new Date(sunday);
    dayDate.setDate(sunday.getDate() + index);
    const dateStr = localISODate(dayDate);
    return {
      ...d,
      dateStr,
      dayNum: dayDate.getDate(),
      isToday: dateStr === todayStr,
    };
  });
}
