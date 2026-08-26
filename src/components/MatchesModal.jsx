import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import YoutubeIcon from "./YoutubeIcon";
import { isAbandoned, sortMatchesDesc, formatYoutubeUrl } from "../lib/ranking";

// Newest date first; matches within a date keep their relative order (stable
// sort), same grouping shape as MatchList's date headers.
function groupByDate(matches) {
  const map = {};
  sortMatchesDesc(matches).forEach((m) => {
    (map[m.date] ||= []).push(m);
  });
  return Object.entries(map)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({ date, items }));
}

// Generic "here's what's behind that number" modal — used by StatCards,
// TopSeeds and Leaderboard so every clickable number card drills down to the
// same match-list look instead of each component rolling its own.
export default function MatchesModal({ title, matches, onClose }) {
  const groups = groupByDate(matches);
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
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            {title}{" "}
            <span className="text-slate-400 dark:text-slate-500 font-medium normal-case">
              ({matches.length})
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>
        {groups.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No matches.</p>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {groups.map(({ date, items }) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {date}
                  </span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {items.length} match{items.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {items.map((m) => {
                    const team1Won = m.score1 > m.score2;
                    const abandoned = isAbandoned(m);
                    return (
                      <div
                        key={m.id}
                        className={`px-3 py-2 rounded-xl border text-xs ${abandoned ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20" : "dark:border-slate-700"}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex-1 text-right ${team1Won ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
                          >
                            {m.team1.join(" & ")}
                          </span>
                          <span className="font-bold shrink-0 bg-white dark:bg-slate-700 rounded px-1.5 py-0.5">
                            <span
                              className={
                                team1Won
                                  ? "text-orange-600"
                                  : "text-slate-500 dark:text-slate-400"
                              }
                            >
                              {m.score1}
                            </span>
                            -
                            <span
                              className={
                                !team1Won
                                  ? "text-orange-600"
                                  : "text-slate-500 dark:text-slate-400"
                              }
                            >
                              {m.score2}
                            </span>
                          </span>
                          <span
                            className={`flex-1 ${!team1Won ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
                          >
                            {m.team2.join(" & ")}
                          </span>
                          {m.youtubeUrl && (
                            <a
                              href={formatYoutubeUrl(m.youtubeUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-red-500 hover:text-red-600 transition p-0.5"
                              title="Watch match video"
                            >
                              <YoutubeIcon size={14} />
                            </a>
                          )}
                        </div>
                        {abandoned && (
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mt-1">
                            <AlertTriangle size={10} /> Abandoned
                          </p>
                        )}
                        {m.comment && (
                          <p className="text-slate-600 dark:text-slate-300 italic font-medium mt-1">
                            "{m.comment}"
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
