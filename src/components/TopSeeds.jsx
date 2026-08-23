import { useState } from "react";
import { Trophy, Users, User, X } from "lucide-react";
import {
  computeStats,
  computeTopPairs,
  filterByPeriod,
  matchesForPair,
  matchesForPlayer,
} from "../lib/ranking";
import MatchesModal from "./MatchesModal";
import Info from "./Info";

const PERIODS = [
  { key: "today", label: "Today", shortLabel: "Day" },
  { key: "sunday", label: "Sunday", shortLabel: "Sun" },
  { key: "week", label: "Week", shortLabel: "Week" },
  { key: "month", label: "Month", shortLabel: "Month" },
  { key: "year", label: "Year", shortLabel: "Year" },
  { key: "all", label: "Overall", shortLabel: "All" },
];

const MODES = [
  { key: "doubles", label: "Doubles", icon: Users },
  { key: "singles", label: "Singles", icon: User },
];

function TopSeedsAllModal({ items, mode, title, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mt-8 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Trophy size={15} className="text-orange-600" /> {title} ({items.length})
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">
            No matches in this period.
          </p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {items.map((p, i) => {
              const displayName =
                mode === "doubles" ? p.players.join(" & ") : p.name;
              const key = mode === "doubles" ? p.players.join("&") : p.name;
              return (
                <div
                  key={key}
                  className="flex items-center justify-between px-3 py-2 rounded-xl border dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={
                        "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 " +
                        (i === 0
                          ? "bg-orange-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400")
                      }
                    >
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {p.wins}W – {p.losses}L · {p.played} played · {p.winRate}% ·{" "}
                        <span className="font-bold text-slate-500 dark:text-slate-300">
                          {(p.score || 0).toFixed(3)}
                        </span>{" "}
                        score
                      </p>
                    </div>
                  </div>
                  <span
                    className={
                      "text-sm font-bold " +
                      (i === 0
                        ? "text-orange-600"
                        : "text-slate-700 dark:text-slate-300")
                    }
                  >
                    {(p.score || 0).toFixed(3)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TopSeeds({ matches = [], players = [] }) {
  const [showAll, setShowAll] = useState(false);
  const [period, setPeriod] = useState("today");
  const [mode, setMode] = useState("doubles");
  const [drilldown, setDrilldown] = useState(null);

  let filtered = filterByPeriod(matches, period);

  if (["week", "month", "year", "all"].includes(period)) {
    // For regular Monday-to-Saturday leaderboards, exclude Sunday matches from stats
    filtered = filtered.filter(
      (m) => new Date(`${m.date}T00:00:00`).getDay() !== 0,
    );
  }

  // Calculate top seeds using Wilson score logic
  let items = [];
  if (mode === "singles") {
    items = computeStats(filtered, players, 1).filter((p) => p.played > 0);
  } else {
    items = computeTopPairs(filtered, 1).filter((p) => p.played > 0);
  }

  const top2 = items.slice(0, 2);

  const periodObj = PERIODS.find((p) => p.key === period);
  const periodLabel = periodObj ? periodObj.label : period;
  const modeObj = MODES.find((m) => m.key === mode);
  const modeLabel = modeObj ? modeObj.label : mode;

  return (
    <div>
      {/* Row 1: Heading on left, Singles/Doubles toggle on right */}
      <div className="flex items-center justify-between mb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            <Trophy size={16} className="text-orange-600" /> Top Seeds
          </h2>
          <Info />
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={
                  "flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition " +
                  (mode === m.key
                    ? "bg-slate-900 dark:bg-orange-600 text-white"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")
                }
              >
                <Icon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: Period pills on left, View All on right */}
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={
                "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition " +
                (period === p.key
                  ? "bg-slate-900 dark:bg-orange-600 text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")
              }
            >
              <span className="sm:hidden">{p.shortLabel}</span>
              <span className="hidden sm:inline">{p.label}</span>
            </button>
          ))}
        </div>
        {items.length > 2 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs font-bold uppercase tracking-wide text-orange-600 hover:text-orange-700 transition"
          >
            View All →
          </button>
        )}
      </div>

      {top2.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl">
          No matches {period === "all" ? "yet" : `for ${periodLabel.toLowerCase()} yet`}.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {top2.map((p, i) => {
          const displayName =
            mode === "doubles" ? p.players.join(" & ") : p.name;
          const key = mode === "doubles" ? p.players.join("&") : p.name;

          return (
            <button
              type="button"
              key={key}
              onClick={() =>
                setDrilldown({
                  title: `${displayName} matches`,
                  list:
                    mode === "doubles"
                      ? matchesForPair(filtered, p.players)
                      : matchesForPlayer(filtered, p.name),
                })
              }
              className={
                "text-left rounded-2xl p-3 relative overflow-hidden transition hover:opacity-90 " +
                (i === 1 ? "hidden sm:block " : "") +
                (i === 0
                  ? "bg-orange-600 text-white"
                  : "bg-white dark:bg-slate-800 border dark:border-slate-700")
              }
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={
                    "text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full " +
                    (i === 0
                      ? "bg-white/20"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400")
                  }
                >
                  Top Seed #{i + 1}
                </span>
                <span className="text-right">
                  <span className="text-lg font-extrabold block">
                    {(p.score || 0).toFixed(3)}
                  </span>
                  <span
                    className={
                      "text-[10px] uppercase tracking-wide " +
                      (i === 0
                        ? "text-orange-100"
                        : "text-slate-400 dark:text-slate-500")
                    }
                  >
                    Wilson Score
                  </span>
                </span>
              </div>
              <Trophy
                size={56}
                className={
                  "absolute -bottom-2 -right-2 " +
                  (i === 0 ? "text-white/10" : "text-slate-100 dark:text-slate-700")
                }
              />
              <p
                className={
                  "font-bold text-sm relative leading-tight " +
                  (i !== 0 ? "text-slate-900 dark:text-white" : "")
                }
              >
                {displayName}
              </p>
              <p
                className={
                  "text-xs relative mt-0.5 " +
                  (i === 0
                    ? "text-orange-100"
                    : "text-slate-500 dark:text-slate-400")
                }
              >
                {p.wins}W – {p.losses}L · {p.played} played · {p.winRate}% win rate
              </p>
            </button>
          );
        })}
      </div>

      {showAll && (
        <TopSeedsAllModal
          items={items}
          mode={mode}
          title={`${periodLabel} Top ${modeLabel}`}
          onClose={() => setShowAll(false)}
        />
      )}

      {drilldown && (
        <MatchesModal
          title={drilldown.title}
          matches={drilldown.list}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
