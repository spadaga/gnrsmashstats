import { useState, useMemo } from "react";
import { Flame } from "lucide-react";
import { filterByPeriod } from "../lib/ranking";
import { getCurrentWeekDates, localISODate } from "../lib/date";
import Avatar from "./Avatar";
import MatchesModal from "./MatchesModal";
import WeekRibbon from "./WeekRibbon";

const PERIODS = [
  { key: "today", label: "Today", shortLabel: "Day" },
  { key: "sunday", label: "Sunday", shortLabel: "Sun" },
  { key: "week", label: "Weekly", shortLabel: "Week" },
  { key: "month", label: "Monthly", shortLabel: "Month" },
  { key: "year", label: "Yearly", shortLabel: "Year" },
  { key: "all", label: "Overall", shortLabel: "All" },
];

export default function PlayerActivity({
  matches = [],
  photoByName = {},
  onViewProfile,
}) {
  const [period, setPeriod] = useState("today");
  const [weekDay, setWeekDay] = useState("all");
  const [drilldown, setDrilldown] = useState(null);

  const weekDates = useMemo(() => getCurrentWeekDates(), []);
  const selectedDayObj = weekDates.find((d) => d.key === weekDay);

  // Filter matches based on period & week day selection
  const filteredMatches = useMemo(() => {
    if (period === "today") {
      const todayStr = localISODate();
      return matches.filter((m) => m.date === todayStr);
    }
    if (period === "sunday") {
      return matches.filter(
        (m) => new Date(`${m.date}T00:00:00`).getDay() === 0,
      );
    }
    if (period === "week") {
      if (weekDay !== "all" && selectedDayObj) {
        return matches.filter((m) => m.date === selectedDayObj.dateStr);
      }
      const weekDateStrings = new Set(weekDates.map((d) => d.dateStr));
      return matches.filter((m) => weekDateStrings.has(m.date));
    }
    if (period === "month") {
      return filterByPeriod(matches, "month");
    }
    if (period === "year") {
      return filterByPeriod(matches, "year");
    }
    return matches;
  }, [matches, period, weekDay, weekDates, selectedDayObj]);

  // Aggregate match counts & win/loss record per player
  const playerStats = useMemo(() => {
    const statsMap = new Map();

    filteredMatches.forEach((m) => {
      const team1Won = m.score1 > m.score2;
      const allParticipants = [...(m.team1 || []), ...(m.team2 || [])];

      allParticipants.forEach((name) => {
        if (!name) return;
        if (!statsMap.has(name)) {
          statsMap.set(name, {
            name,
            played: 0,
            wins: 0,
            losses: 0,
            matches: [],
          });
        }
        const s = statsMap.get(name);
        s.played += 1;
        s.matches.push(m);
        const onTeam1 = (m.team1 || []).includes(name);
        const won = onTeam1 ? team1Won : !team1Won;
        if (won) s.wins += 1;
        else s.losses += 1;
      });
    });

    const list = Array.from(statsMap.values()).map((s) => ({
      ...s,
      winRate: s.played ? Math.round((s.wins / s.played) * 100) : 0,
    }));

    // Sort strictly descending by matches played
    list.sort((a, b) => {
      if (b.played !== a.played) return b.played - a.played;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [filteredMatches]);

  const maxPlayed = playerStats.length > 0 ? playerStats[0].played : 0;
  const totalMatchesCount = filteredMatches.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Player Match Activity</span>
              <span className="text-xs font-semibold normal-case px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {totalMatchesCount} match{totalMatchesCount !== 1 ? "es" : ""}
              </span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Matches played in descending order
            </p>
          </div>
        </div>

        {/* Period Pills */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => {
                setPeriod(p.key);
                if (p.key !== "week") setWeekDay("all");
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
                period === p.key
                  ? "bg-slate-900 dark:bg-orange-600 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <span className="sm:hidden">{p.shortLabel}</span>
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2-Tier Smart Week Ribbon when Weekly is selected */}
      {period === "week" && (
        <div className="mb-3">
          <WeekRibbon
            matches={matches}
            selectedDay={weekDay}
            onSelectDay={setWeekDay}
          />
        </div>
      )}

      {/* Players List in Descending Order */}
      <div className="space-y-2">
        {playerStats.map((p, idx) => {
          const rank = idx + 1;
          const barWidthPct =
            maxPlayed > 0 ? Math.max((p.played / maxPlayed) * 100, 15) : 100;
          const winPct = p.played > 0 ? (p.wins / p.played) * 100 : 0;
          const lossPct = 100 - winPct;

          return (
            <div
              key={p.name}
              className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-750 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition cursor-pointer border border-slate-100 dark:border-slate-700/50"
              onClick={() =>
                setDrilldown({
                  title: `${p.name} matches`,
                  matches: p.matches,
                })
              }
            >
              {/* Left: Rank, Avatar & Player Name */}
              <div className="flex items-center gap-2.5 min-w-[130px] sm:min-w-[170px] shrink-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                    rank === 1
                      ? "bg-amber-500 text-white shadow-xs"
                      : rank === 2
                        ? "bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-slate-100"
                        : rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {rank}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProfile?.(p.name);
                  }}
                  className="flex items-center gap-2 text-left hover:opacity-80 transition"
                  title="View Profile"
                >
                  <Avatar name={p.name} photo={photoByName[p.name]} size="sm" />
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate hover:text-orange-600 dark:hover:text-orange-400">
                    {p.name}
                  </span>
                </button>
              </div>

              {/* Middle: Visual Proportional Graph (Green won, Red lost) */}
              <div className="flex-1 min-w-0 hidden xs:block sm:block">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-medium text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {p.wins}W
                    </span>{" "}
                    ·{" "}
                    <span className="font-bold text-red-500 dark:text-red-400">
                      {p.losses}L
                    </span>
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {p.winRate}% win
                  </span>
                </div>
                {/* Horizontal Progress Bar */}
                <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-2 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${barWidthPct}%` }}
                    className="h-full flex rounded-full overflow-hidden transition-all duration-300"
                  >
                    {p.wins > 0 && (
                      <div
                        style={{ width: `${winPct}%` }}
                        className="bg-emerald-500 h-full"
                        title={`${p.wins} Won`}
                      />
                    )}
                    {p.losses > 0 && (
                      <div
                        style={{ width: `${lossPct}%` }}
                        className="bg-red-500 h-full"
                        title={`${p.losses} Lost`}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Total Matches in Bold Red */}
              <div className="text-right shrink-0 min-w-[70px]">
                <span className="text-base sm:text-lg font-black text-red-600 dark:text-red-400 tracking-tight">
                  {p.played}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-1">
                  {p.played === 1 ? "match" : "matches"}
                </span>
                {/* Mobile-only win/loss summary */}
                <div className="block xs:hidden sm:hidden text-[10px] text-slate-400">
                  <span className="text-emerald-600 font-bold">{p.wins}W</span>{" "}
                  <span className="text-red-500 font-bold">{p.losses}L</span>
                </div>
              </div>
            </div>
          );
        })}

        {playerStats.length === 0 && (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
            {period === "today" ? (
              <p>No matches recorded today yet.</p>
            ) : period === "week" && weekDay !== "all" && selectedDayObj ? (
              <p>
                No matches recorded on {selectedDayObj.dayName},{" "}
                {selectedDayObj.dateStr}.
              </p>
            ) : (
              <p>No matches recorded in this period.</p>
            )}
          </div>
        )}
      </div>

      {/* Matches Modal Drilldown */}
      {drilldown && (
        <MatchesModal
          title={drilldown.title}
          matches={drilldown.matches}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
