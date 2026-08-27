import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { getCurrentWeekDates } from "../lib/date";

export default function WeekRibbon({
  matches = [],
  selectedDay = "all",
  onSelectDay,
  className = "",
}) {
  const weekDays = useMemo(() => getCurrentWeekDates(), []);

  // Compute match count per day of this week
  const dayStats = useMemo(() => {
    const matchMap = new Map();
    matches.forEach((m) => {
      if (m.date) {
        matchMap.set(m.date, (matchMap.get(m.date) || 0) + 1);
      }
    });

    const daysWithCounts = weekDays.map((d) => ({
      ...d,
      count: matchMap.get(d.dateStr) || 0,
    }));

    const totalWeekMatches = daysWithCounts.reduce((acc, d) => acc + d.count, 0);

    return { days: daysWithCounts, totalWeekMatches };
  }, [matches, weekDays]);

  return (
    <div
      className={`w-full overflow-x-auto no-scrollbar py-1 animate-in fade-in duration-200 ${className}`}
    >
      <div className="flex items-center gap-1.5 min-w-max p-1 bg-slate-100/80 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
        {/* All Week Aggregated Button */}
        <button
          type="button"
          onClick={() => onSelectDay("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
            selectedDay === "all"
              ? "bg-orange-600 text-white shadow-xs"
              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 border dark:border-slate-700/60"
          }`}
          title="Aggregated full week matches"
        >
          <Sparkles size={13} className={selectedDay === "all" ? "text-orange-200" : "text-orange-500"} />
          <span>All Week</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              selectedDay === "all"
                ? "bg-orange-700 text-orange-100"
                : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
            }`}
          >
            {dayStats.totalWeekMatches}m
          </span>
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-0.5 shrink-0" />

        {/* 7 Days: Sun to Sat */}
        {dayStats.days.map((d) => {
          const isSelected = selectedDay === d.key;
          const hasMatches = d.count > 0;

          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onSelectDay(d.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                isSelected
                  ? "bg-orange-600 text-white shadow-xs"
                  : hasMatches
                  ? "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-slate-700 border dark:border-slate-700/60"
                  : "bg-white/60 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700/40 border border-dashed dark:border-slate-700/40"
              }`}
              title={`${d.dayName}, ${d.dateStr} (${d.count} match${d.count !== 1 ? "es" : ""})`}
            >
              <div className="flex items-center gap-1">
                <span>{d.shortDay}</span>
                <span className="text-[10px] opacity-75 font-mono">{d.dayNum}</span>
              </div>

              {d.isToday && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-white" : "bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900"
                  }`}
                  title="Today"
                />
              )}

              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? "bg-orange-700 text-orange-100"
                    : hasMatches
                    ? "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400"
                    : "bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500"
                }`}
              >
                {d.count}m
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
