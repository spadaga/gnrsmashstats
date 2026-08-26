import { useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, Users, User, X } from "lucide-react";
import {
  computeStats,
  computeTopPairs,
  filterByPeriod,
  getRankingConfig,
  matchesForPair,
  matchesForPlayer,
} from "../lib/ranking";
import MatchesModal from "./MatchesModal";
import Avatar from "./Avatar";
import { photoMap } from "../lib/admins";
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
  { key: "doubles", label: "Doubles", shortLabel: "Dbls", icon: Users },
  { key: "singles", label: "Singles", shortLabel: "Sgls", icon: User },
];

function TopSeedsAllModal({ items, mode, title, onClose, photoByName = {} }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mt-8 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Trophy size={15} className="text-orange-600" /> {title} (
            {items.length})
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
                    <div className="flex items-center gap-1 shrink-0">
                      {mode === "doubles" ? (
                        <>
                          <Avatar
                            name={p.players[0]}
                            photo={photoByName[p.players[0]]}
                            size="xs"
                            className="ring-1 ring-white dark:ring-slate-800"
                          />
                          <Avatar
                            name={p.players[1]}
                            photo={photoByName[p.players[1]]}
                            size="xs"
                            className="ring-1 ring-white dark:ring-slate-800"
                          />
                        </>
                      ) : (
                        <Avatar
                          name={p.name}
                          photo={photoByName[p.name]}
                          size="xs"
                          className="ring-1 ring-white dark:ring-slate-800"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {p.wins}W – {p.losses}L · {p.played} played ·{" "}
                        {p.winRate}% ·{" "}
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
    </div>,
    document.body,
  );
}

export default function TopSeeds({
  matches = [],
  players = [],
  photoByName = {},
}) {
  const photos =
    Object.keys(photoByName).length > 0 ? photoByName : photoMap(players);
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

  const { minMatches, prioritizeRegular } = getRankingConfig(period);

  // Calculate top seeds using Wilson score logic
  let items = [];
  if (mode === "singles") {
    items = computeStats(
      filtered,
      players,
      minMatches,
      prioritizeRegular,
    ).filter((p) => p.played > 0);
  } else {
    items = computeTopPairs(filtered, minMatches, prioritizeRegular).filter(
      (p) => p.played > 0,
    );
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
                <span className="sm:hidden">{m.shortLabel || m.label}</span>
                <span className="hidden sm:inline">{m.label}</span>
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
          No matches{" "}
          {period === "all" ? "yet" : `for ${periodLabel.toLowerCase()} yet`}.
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
                "text-left rounded-2xl p-3.5 sm:p-4 relative overflow-hidden transition hover:opacity-95 shadow-sm " +
                (i === 1 ? "hidden sm:block " : "") +
                (i === 0
                  ? "bg-orange-600 text-white"
                  : "bg-white dark:bg-slate-800 border dark:border-slate-700")
              }
            >
              <Trophy
                size={64}
                className={
                  "absolute -bottom-3 -right-3 pointer-events-none " +
                  (i === 0
                    ? "text-white/10"
                    : "text-slate-100 dark:text-slate-700/40")
                }
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                {/* Left Column: Pill + Name + Record */}
                <div className="flex-1 min-w-0 pr-1">
                  <span
                    className={
                      "inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-1.5 " +
                      (i === 0
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400")
                    }
                  >
                    Top Seed #{i + 1}
                  </span>
                  <p
                    className={
                      "font-bold text-sm sm:text-base leading-snug truncate " +
                      (i === 0
                        ? "text-white"
                        : "text-slate-900 dark:text-white")
                    }
                    title={displayName}
                  >
                    {displayName}
                  </p>
                  <p
                    className={
                      "text-xs mt-1 leading-tight " +
                      (i === 0
                        ? "text-orange-100"
                        : "text-slate-500 dark:text-slate-400")
                    }
                  >
                    {p.wins}W – {p.losses}L · {p.played} played · {p.winRate}%
                    win rate
                  </p>
                </div>

                {/* Right Column: Score & Photos */}
                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black block leading-none">
                      {(p.score || 0).toFixed(3)}
                    </span>
                    <span
                      className={
                        "text-[9px] font-bold uppercase tracking-wide block mt-0.5 " +
                        (i === 0
                          ? "text-orange-100"
                          : "text-slate-400 dark:text-slate-500")
                      }
                    >
                      Wilson Score
                    </span>
                  </div>

                  {/* Top Seed Photos */}
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {mode === "doubles" ? (
                      <>
                        <Avatar
                          name={p.players[0]}
                          photo={photos[p.players[0]]}
                          size="sm"
                          className={`ring-2 ${i === 0 ? "ring-white/40" : "ring-slate-200 dark:ring-slate-700"}`}
                        />
                        <Avatar
                          name={p.players[1]}
                          photo={photos[p.players[1]]}
                          size="sm"
                          className={`ring-2 ${i === 0 ? "ring-white/40" : "ring-slate-200 dark:ring-slate-700"}`}
                        />
                      </>
                    ) : (
                      <Avatar
                        name={p.name}
                        photo={photos[p.name]}
                        size="md"
                        className={`ring-2 ${i === 0 ? "ring-white/40" : "ring-slate-200 dark:ring-slate-700"}`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showAll && (
        <TopSeedsAllModal
          items={items}
          mode={mode}
          photoByName={photos}
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
