// Local (browser-timezone) calendar date as YYYY-MM-DD.
// `new Date().toISOString().slice(0, 10)` returns the UTC calendar date, which
// is a day behind local time for the first few hours of each day in timezones
// ahead of UTC (e.g. IST, UTC+5:30 — UTC is still "yesterday" until 05:30 IST).
export function localISODate(d = new Date()) {
  const tzOffsetMs = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}
