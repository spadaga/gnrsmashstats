import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Pencil,
  Search,
  Swords,
  Trophy,
  Trash2,
} from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { formatYoutubeUrl, isAbandoned } from "../lib/ranking";
import { localISODate } from "../lib/date";
import MatchEditModal from "./MatchEditModal";
import YoutubeIcon from "./YoutubeIcon";

const MODES = [
  { key: "today", label: "Today" },
  { key: "sunday", label: "Sunday" },
  { key: "h2h", label: "Head-to-Head" },
  { key: "all", label: "All Matches" },
];

const todayISO = () => localISODate();

function formatDateHeader(iso) {
  if (iso === todayISO()) {
    const label = new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    return "Today (" + label + ")";
  }
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupByDate(matches) {
  const map = {};
  matches.forEach((m, i) => {
    (map[m.date] ||= []).push({ m, i });
  });
  return Object.entries(map)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, entries]) => ({
      date,
      // Descending order by loggedAt (last logged match comes first)
      items: entries
        .slice()
        .sort((a, b) => {
          const timeA = a.m.loggedAt ? new Date(a.m.loggedAt).getTime() : NaN;
          const timeB = b.m.loggedAt ? new Date(b.m.loggedAt).getTime() : NaN;
          if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
            return timeB - timeA; // Newest / latest loggedAt first
          }
          return b.i - a.i; // Higher raw index was logged later -> comes first
        })
        .map((e) => e.m),
    }));
}

function PlayerSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 min-w-0 border dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:border-orange-400 focus:outline-none"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

const pairKey = (a, b) => [a, b].sort().join("|");

export default function MatchList({
  matches,
  players,
  onDelete,
  onUpdate,
  onLogMatch,
  isAdmin,
  isSuperAdmin,
  canEditVideo,
  photoByName,
}) {
  const [mode, setMode] = useState("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [editingMatch, setEditingMatch] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [h2h, setH2h] = useState(["", "", "", ""]);

  const playerNames = (players || []).map((p) =>
    typeof p === "string" ? p : p.name,
  );

  // Sequence number per match, derived from the full (unfiltered) list so the
  // same match shows the same number regardless of which of the 3 mode tabs
  // it's viewed in. Oldest match = #1; since the UI lists newest-first, this
  // reads as descending (132, 131, 130, ...) top to bottom.
  const seqById = useMemo(() => {
    const oldestFirst = matches
      .map((m, i) => ({ m, i }))
      .sort((a, b) => {
        if (a.m.date !== b.m.date) {
          return a.m.date < b.m.date ? -1 : 1; // Earliest date first
        }
        const timeA = a.m.loggedAt ? new Date(a.m.loggedAt).getTime() : NaN;
        const timeB = b.m.loggedAt ? new Date(b.m.loggedAt).getTime() : NaN;
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeA - timeB; // Earliest loggedAt first
        }
        return a.i - b.i; // Earliest raw index first
      });
    return new Map(oldestFirst.map(({ m }, idx) => [m.id, idx + 1]));
  }, [matches]);

  const [ha, hb, hc, hd] = h2h;
  const h2hChosen = h2h.filter(Boolean);
  const h2hActive =
    mode === "h2h" && h2hChosen.length === 4 && new Set(h2hChosen).size === 4;

  function selectMode(next) {
    setMode(next);
    if (next !== "h2h") setH2h(["", "", "", ""]);
  }
  const h2hOptions = (current) =>
    playerNames.filter((p) => p === current || !h2hChosen.includes(p));
  const selA = h2hActive ? pairKey(ha, hb) : null;
  const selB = h2hActive ? pairKey(hc, hd) : null;

  const visible = matches.filter((m) => {
    if (mode === "today" && m.date !== todayISO()) return false;
    if (mode === "sunday" && new Date(`${m.date}T00:00:00`).getDay() !== 0) return false;
    if (mode === "all" && ((from && m.date < from) || (to && m.date > to)))
      return false;
    if (search) {
      const q = search.trim().toLowerCase();
      const haystack = [...m.team1, ...m.team2, m.comment || ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (h2hActive) {
      const mA = pairKey(m.team1[0], m.team1[1]);
      const mB = pairKey(m.team2[0], m.team2[1]);
      const isMatchup =
        (mA === selA && mB === selB) || (mA === selB && mB === selA);
      if (!isMatchup) return false;
    }
    return true;
  });
  const groups = groupByDate(visible);

  let h2hSummary = null;
  if (h2hActive) {
    let winsA = 0,
      winsB = 0;
    visible.forEach((m) => {
      const team1Won = m.score1 > m.score2;
      const team1IsA = pairKey(m.team1[0], m.team1[1]) === selA;
      if (team1Won === team1IsA) winsA++;
      else winsB++;
    });
    const labelA = ha + " & " + hb;
    const labelB = hc + " & " + hd;
    if (winsA === 0 && winsB === 0)
      h2hSummary = "No matches yet between " + labelA + " and " + labelB + ".";
    else if (winsA === winsB)
      h2hSummary = labelA + " vs " + labelB + ": tied " + winsA + "–" + winsB + ".";
    else if (winsA > winsB)
      h2hSummary = labelA + " lead " + labelB + " " + winsA + "–" + winsB + ".";
    else h2hSummary = labelB + " lead " + labelA + " " + winsB + "–" + winsA + ".";
  }

  async function handleDelete() {
    const id = confirm;
    setConfirm(null);
    setDeleting(true);
    try {
      await onDelete(id);
    } finally {
      setDeleting(false);
    }
  }
  async function handleSaveScore(id, updates) {
    setEditingMatch(null);
    await onUpdate(id, updates);
  }

  const inputCls =
    "border dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100";

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4">
      <div className="relative mb-3">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by player or comment…"
          className={inputCls + " w-full pl-7 font-bold text-sm text-slate-900 dark:text-white placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"}
        />
      </div>

      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Recent Matches
        </h2>
        {onLogMatch && isAdmin && (
          <button
            onClick={onLogMatch}
            className="text-xs font-bold uppercase tracking-wide text-orange-600 hover:text-orange-700"
          >
            Log Match →
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
          {MODES.map((r) => (
            <button
              key={r.key}
              onClick={() => selectMode(r.key)}
              className={
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition " +
                (mode === r.key
                  ? "bg-slate-900 dark:bg-orange-600 text-white"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200")
              }
            >
              {r.key === "h2h" && <Swords size={12} />}
              {r.label}
            </button>
          ))}
        </div>
        {mode === "all" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={inputCls}
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={inputCls}
            />
            {(from || to) && (
              <button
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
                className="text-xs font-medium text-slate-400 hover:text-orange-500"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {mode === "h2h" && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <PlayerSelect
            value={ha}
            onChange={(v) => setH2h([v, hb, hc, hd])}
            options={h2hOptions(ha)}
            placeholder="Player 1"
          />
          <span className="text-slate-400 text-xs">&</span>
          <PlayerSelect
            value={hb}
            onChange={(v) => setH2h([ha, v, hc, hd])}
            options={h2hOptions(hb)}
            placeholder="Player 2"
          />
          <span className="text-slate-300 dark:text-slate-600 text-xs mx-1">
            vs
          </span>
          <PlayerSelect
            value={hc}
            onChange={(v) => setH2h([ha, hb, v, hd])}
            options={h2hOptions(hc)}
            placeholder="Player 3"
          />
          <span className="text-slate-400 text-xs">&</span>
          <PlayerSelect
            value={hd}
            onChange={(v) => setH2h([ha, hb, hc, v])}
            options={h2hOptions(hd)}
            placeholder="Player 4"
          />
          {h2hChosen.length > 0 && (
            <button
              onClick={() => setH2h(["", "", "", ""])}
              className="text-xs font-medium text-slate-400 hover:text-orange-500 ml-1"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {h2hSummary && (
        <div className="mb-3 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-semibold text-center">
          {h2hSummary}
        </div>
      )}

      <div className="space-y-4 max-h-[40rem] overflow-y-auto pr-1">
        {groups.map(({ date, items }) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={
                  "text-[11px] font-bold uppercase tracking-wide " +
                  (date === todayISO()
                    ? "text-orange-500"
                    : "text-slate-400 dark:text-slate-500")
                }
              >
                {formatDateHeader(date)}
              </span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-700" />
              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                {items.length} match{items.length !== 1 ? "es" : ""}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((m, idx) => {
                const team1Won = m.score1 > m.score2;
                const winnerTeam = team1Won ? m.team1 : m.team2;
                const winnerScore = team1Won ? m.score1 : m.score2;
                const loserTeam = team1Won ? m.team2 : m.team1;
                const loserScore = team1Won ? m.score2 : m.score1;

                const canEdit = isSuperAdmin || isAdmin || canEditVideo;
                const canDelete = isSuperAdmin;
                const abandoned = isAbandoned(m);
                const dayNo = items.length - idx;
                return (
                  <div
                    key={m.id}
                    className={
                      "rounded-xl px-3 py-2.5 transition " +
                      (abandoned
                        ? "border-2 border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20"
                        : "border dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-0.5">
                          {mode === "today"
                            ? "Match #" + dayNo
                            : "Match #" + dayNo + " · Overall #" + seqById.get(m.id)}
                        </p>
                        <div className="flex items-center gap-3 text-sm">
                          {/* Left side: Always winning team in green */}
                          <div className="text-right flex-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <Trophy
                              size={12}
                              className="inline mb-0.5 mr-1 text-emerald-500 dark:text-emerald-400"
                            />
                            {winnerTeam.join(" & ")}
                          </div>
                          {/* Center: Score box with winning score on the left */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="flex items-center gap-1 font-bold bg-slate-50 dark:bg-slate-700 rounded-lg px-2 py-1">
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {winnerScore}
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">
                                -
                              </span>
                              <span className="text-slate-400 dark:text-slate-500">
                                {loserScore}
                              </span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                              +{Math.abs(m.score1 - m.score2)}
                            </span>
                          </div>
                          {/* Right side: Losing team */}
                          <div className="flex-1 font-medium text-slate-500 dark:text-slate-400">
                            {loserTeam.join(" & ")}
                          </div>
                        </div>
                        {abandoned && (
                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mt-1">
                            <AlertTriangle size={11} /> Abandoned — did not
                            reach 21
                          </p>
                        )}
                        {m.comment && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 italic font-medium mt-1">
                            "{m.comment}"
                          </p>
                        )}
                      </div>
                      {/* Action buttons & YouTube video link */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {m.youtubeUrl && (
                          <a
                            href={formatYoutubeUrl(m.youtubeUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition hover:scale-110 shrink-0"
                            title="Watch match on YouTube"
                          >
                            <YoutubeIcon size={18} />
                          </a>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => setEditingMatch(m)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition"
                            title="Edit match & YouTube video link"
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setConfirm(m.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            title="Delete match"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-slate-400 text-center py-4 text-sm">
            No matches in this range.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title="Delete this match?"
        message="This match record will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />

      {editingMatch && (
        <MatchEditModal
          match={editingMatch}
          players={playerNames}
          onSave={handleSaveScore}
          onClose={() => setEditingMatch(null)}
          photoByName={photoByName}
        />
      )}

      {deleting && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-xl shadow-lg px-5 py-3">
            <Loader2 size={18} className="animate-spin text-orange-600" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Deleting…
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
