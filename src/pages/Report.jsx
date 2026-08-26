import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import YoutubeIcon from "../components/YoutubeIcon";
import {
  computeStats,
  computePairStats,
  computeDuoStats,
  computeHeadToHead,
  computeAbandonedMatches,
  applyPeriod,
  getRankingConfig,
  matchesForPlayer,
  matchesForPair,
  formatYoutubeUrl,
} from "../lib/ranking";
import ConfirmDialog from "../components/ConfirmDialog";

const TABS = [
  { key: "duo", label: "Duo Head-to-Head", shortLabel: "Duo H2H" },
  { key: "combos", label: "Player Combos", shortLabel: "Combos" },
  { key: "individual", label: "Individual Rankings", shortLabel: "Individual" },
  { key: "pairs", label: "Pair Rankings", shortLabel: "Pairs" },
  { key: "abandoned", label: "Abandoned Matches", shortLabel: "Abandoned" },
  { key: "partyDue", label: "Party Dues", shortLabel: "Dues" },
];

const PERIODS = [
  { key: "today", label: "Today", shortLabel: "Day" },
  { key: "week", label: "Week", shortLabel: "Week" },
  { key: "month", label: "Month", shortLabel: "Month" },
  { key: "year", label: "Year", shortLabel: "Year" },
  { key: "custom", label: "Custom Range", shortLabel: "Custom" },
];

const selectCls =
  "border dark:border-slate-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:border-orange-400 focus:outline-none";
const dateCls =
  "border dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100";

export function Bar({ label, value, max, color = "bg-orange-600" }) {
  const pct = max > 0 && value > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 sm:w-36 shrink-0 text-xs text-slate-600 dark:text-slate-300 truncate">
        {label}
      </span>
      <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-bold text-slate-700 dark:text-slate-200">
        {value}
      </span>
    </div>
  );
}

export function PeriodTabs({
  period,
  onPeriod,
  from,
  to,
  onFrom,
  onTo,
  periods = PERIODS,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriod(p.key)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition ${
              period === p.key
                ? "bg-slate-900 dark:bg-orange-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <span className="sm:hidden">
              {p.shortLabel || p.short || p.label}
            </span>
            <span className="hidden sm:inline">{p.label}</span>
          </button>
        ))}
      </div>
      {period === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
            className={dateCls}
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onTo(e.target.value)}
            className={dateCls}
          />
        </div>
      )}
    </div>
  );
}

function StatTile({
  value,
  label,
  color = "text-orange-600",
  onClick,
  active,
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`text-center rounded-xl py-3 px-2 transition w-full ${
        active
          ? "bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-400"
          : "bg-slate-50 dark:bg-slate-700/50"
      } ${onClick ? "cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-900/20" : ""}`}
    >
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
        {label}
      </p>
    </Tag>
  );
}

function MatchRow({ m }) {
  const team1Won = m.score1 > m.score2;
  return (
    <div className="px-3 py-2 rounded-lg border dark:border-slate-700 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 w-16 shrink-0">{m.date}</span>
        <span
          className={`flex-1 text-right ${team1Won ? "font-bold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}
        >
          {m.team1.join(" & ")}
        </span>
        <span className="font-bold shrink-0 bg-slate-50 dark:bg-slate-700 rounded px-1.5 py-0.5">
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
      {m.comment && (
        <p className="text-slate-600 dark:text-slate-300 italic font-medium mt-1">
          "{m.comment}"
        </p>
      )}
    </div>
  );
}

function MatchResultsPanel({ title, matches }) {
  return (
    <div className="mt-4 border-t dark:border-slate-700 pt-4">
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
        {title} ({matches.length})
      </h4>
      {matches.length === 0 ? (
        <p className="text-slate-400 text-sm">No matches.</p>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {matches.map((m) => (
            <MatchRow key={m.id} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}

function DuoSection({ matches, players }) {
  const [a, setA] = useState(players[0] || "");
  const [b, setB] = useState(players[1] || "");
  const [selected, setSelected] = useState(null);
  const aOptions = players.filter((p) => p !== b);
  const bOptions = players.filter((p) => p !== a);
  const ready = a && b && a !== b;
  const s = ready ? computeDuoStats(matches, a, b) : null;
  const h2h = ready ? computeHeadToHead(matches, a, b) : null;
  const max = s
    ? Math.max(1, s.togetherWins, s.togetherLosses, s.aWithoutBWins)
    : 1;

  function pick(key, e) {
    e.target.blur();
    setSelected((cur) => (cur === key ? null : key));
  }
  function selectPlayer(setter, value) {
    setter(value);
    setSelected(null);
  }

  const panels =
    s && h2h
      ? {
          togetherWins: {
            title: `Wins — ${a} & ${b} together`,
            list: s.matches.togetherWins,
          },
          togetherLosses: {
            title: `Losses — ${a} & ${b} together`,
            list: s.matches.togetherLosses,
          },
          aWithoutBWins: {
            title: `${a}'s wins without ${b}`,
            list: s.matches.aWithoutBWins,
          },
          h2hA: {
            title: `${a} beat ${b} (any partner)`,
            list: h2h.matches.aWins,
          },
          h2hB: {
            title: `${b} beat ${a} (any partner)`,
            list: h2h.matches.bWins,
          },
        }
      : {};
  const activePanel = selected ? panels[selected] : null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={a}
          onChange={(e) => selectPlayer(setA, e.target.value)}
          className={selectCls}
        >
          {aOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-slate-400 text-xs">&</span>
        <select
          value={b}
          onChange={(e) => selectPlayer(setB, e.target.value)}
          className={selectCls}
        >
          {bOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      {!ready ? (
        <p className="text-slate-400 text-sm">Pick two different players.</p>
      ) : (
        <>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            As Teammates
          </h3>
          <div className="grid grid-cols-3 gap-3 mb-2">
            <StatTile
              value={s.togetherWins}
              label={`Wins ${a} & ${b} together`}
              onClick={(e) => pick("togetherWins", e)}
              active={selected === "togetherWins"}
            />
            <StatTile
              value={s.togetherLosses}
              label={`Losses with ${b}`}
              color="text-slate-700 dark:text-slate-200"
              onClick={(e) => pick("togetherLosses", e)}
              active={selected === "togetherLosses"}
            />
            <StatTile
              value={s.aWithoutBWins}
              label={`${a}'s wins without ${b}`}
              onClick={(e) => pick("aWithoutBWins", e)}
              active={selected === "aWithoutBWins"}
            />
          </div>
          <div className="space-y-2 mb-5">
            <Bar label="Together — Wins" value={s.togetherWins} max={max} />
            <Bar
              label={`Losses w/ ${b}`}
              value={s.togetherLosses}
              max={max}
              color="bg-slate-400 dark:bg-slate-500"
            />
            <Bar
              label={`${a} w/o ${b} — Wins`}
              value={s.aWithoutBWins}
              max={max}
            />
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            Head-to-Head — {a} vs {b} (any partner)
          </h3>
          {h2h.played === 0 ? (
            <p className="text-slate-400 text-sm">
              {a} and {b} haven't faced each other directly yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <StatTile
                  value={h2h.aWins}
                  label={`${a} wins vs ${b}`}
                  onClick={(e) => pick("h2hA", e)}
                  active={selected === "h2hA"}
                />
                <StatTile
                  value={h2h.bWins}
                  label={`${b} wins vs ${a}`}
                  onClick={(e) => pick("h2hB", e)}
                  active={selected === "h2hB"}
                />
              </div>
              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                {h2h.aWins === h2h.bWins
                  ? `Tied ${h2h.aWins}–${h2h.bWins} in direct matchups.`
                  : h2h.aWins > h2h.bWins
                    ? `${a} leads ${b} ${h2h.aWins}–${h2h.bWins} in direct matchups.`
                    : `${b} leads ${a} ${h2h.bWins}–${h2h.aWins} in direct matchups.`}
              </p>
            </>
          )}

          {activePanel && (
            <MatchResultsPanel
              title={activePanel.title}
              matches={activePanel.list}
            />
          )}
        </>
      )}
    </div>
  );
}

function CombosSection({ matches, players }) {
  const [p, setP] = useState(players[0] || "");
  const [selected, setSelected] = useState(null);
  const pairs = computePairStats(matches).filter((x) => x.players.includes(p));
  const partnerOf = (pair) => pair.players.find((n) => n !== p);
  const overall = pairs.reduce(
    (acc, x) => ({
      played: acc.played + x.played,
      wins: acc.wins + x.wins,
      losses: acc.losses + x.losses,
    }),
    { played: 0, wins: 0, losses: 0 },
  );
  const max = Math.max(1, ...pairs.map((x) => x.played));

  function pick(key, e) {
    e.target.blur();
    setSelected((cur) => (cur === key ? null : key));
  }
  function selectPlayer(v) {
    setP(v);
    setSelected(null);
  }

  let panelTitle = null,
    panelMatches = [];
  if (selected === "total") {
    panelTitle = `All of ${p}'s matches`;
    panelMatches = matchesForPlayer(matches, p);
  } else if (selected?.startsWith("partner:")) {
    const partner = selected.slice("partner:".length);
    panelTitle = `${p} & ${partner} together`;
    panelMatches = matchesForPair(matches, [p, partner]);
  }

  return (
    <div>
      <select
        value={p}
        onChange={(e) => selectPlayer(e.target.value)}
        className={`${selectCls} mb-4`}
      >
        {players.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {pairs.length === 0 ? (
        <p className="text-slate-400 text-sm">No matches for {p} yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <StatTile value={pairs.length} label="Combinations played" />
            <StatTile
              value={overall.played}
              label="Total matches"
              onClick={(e) => pick("total", e)}
              active={selected === "total"}
            />
            <StatTile
              value={`${overall.wins}W – ${overall.losses}L`}
              label="Overall record"
              onClick={(e) => pick("total", e)}
              active={selected === "total"}
            />
          </div>
          <div className="space-y-2 mb-5">
            {pairs.map((x) => (
              <Bar
                key={x.players.join("|")}
                label={`w/ ${partnerOf(x)}`}
                value={x.played}
                max={max}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            {pairs.map((x) => {
              const partner = partnerOf(x);
              const key = `partner:${partner}`;
              return (
                <button
                  key={x.players.join("|")}
                  type="button"
                  onClick={(e) => pick(key, e)}
                  className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border transition ${
                    selected === key
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800"
                  }`}
                >
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                    w/ {partner}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {x.played} played ·{" "}
                    <span className="text-orange-600 font-bold">{x.wins}W</span>{" "}
                    – {x.losses}L · {x.winRate}%
                  </span>
                </button>
              );
            })}
          </div>
          {panelTitle && (
            <MatchResultsPanel title={panelTitle} matches={panelMatches} />
          )}
        </>
      )}
    </div>
  );
}

function IndividualSection({ matches, players }) {
  const [period, setPeriod] = useState("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = applyPeriod(matches, period, from, to);
  const { minMatches, prioritizeRegular } = getRankingConfig(period);
  const stats = computeStats(filtered, players, minMatches, prioritizeRegular)
    .filter((s) => s.played > 0)
    .slice(0, 10);
  const max = Math.max(1, ...stats.map((s) => s.wins));

  function pick(name, e) {
    e.target.blur();
    setSelected((cur) => (cur === name ? null : name));
  }
  function changePeriod(v) {
    setPeriod(v);
    setSelected(null);
  }

  return (
    <div>
      <PeriodTabs
        period={period}
        onPeriod={changePeriod}
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
      />
      {stats.length === 0 ? (
        <p className="text-slate-400 text-sm">No matches in this range.</p>
      ) : (
        <>
          <div className="space-y-2 mb-5">
            {stats.map((s) => (
              <Bar key={s.name} label={s.name} value={s.wins} max={max} />
            ))}
          </div>
          <div className="space-y-1.5">
            {stats.map((s, i) => (
              <button
                key={s.name}
                type="button"
                onClick={(e) => pick(s.name, e)}
                className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border transition ${
                  selected === s.name
                    ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800"
                }`}
              >
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {i + 1}. {s.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {s.played} played ·{" "}
                  <span className="text-orange-600 font-bold">{s.wins}W</span> –{" "}
                  {s.losses}L · {s.winRate}%
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <MatchResultsPanel
              title={`${selected}'s matches`}
              matches={matchesForPlayer(filtered, selected)}
            />
          )}
        </>
      )}
    </div>
  );
}

function PairsSection({ matches }) {
  const [period, setPeriod] = useState("week");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState(null);
  const filtered = applyPeriod(matches, period, from, to);
  const pairs = computePairStats(filtered).slice(0, 10);
  const max = Math.max(1, ...pairs.map((p) => p.wins));

  function pick(key, e) {
    e.target.blur();
    setSelected((cur) => (cur === key ? null : key));
  }
  function changePeriod(v) {
    setPeriod(v);
    setSelected(null);
  }
  const selectedPair = selected
    ? pairs.find((p) => p.players.join("|") === selected)
    : null;

  return (
    <div>
      <PeriodTabs
        period={period}
        onPeriod={changePeriod}
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
      />
      {pairs.length === 0 ? (
        <p className="text-slate-400 text-sm">No matches in this range.</p>
      ) : (
        <>
          <div className="space-y-2 mb-5">
            {pairs.map((p) => (
              <Bar
                key={p.players.join("|")}
                label={p.players.join(" & ")}
                value={p.wins}
                max={max}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            {pairs.map((p, i) => {
              const key = p.players.join("|");
              return (
                <button
                  key={key}
                  type="button"
                  onClick={(e) => pick(key, e)}
                  className={`w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border transition ${
                    selected === key
                      ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-800"
                  }`}
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {i + 1}. {p.players.join(" & ")}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {p.played} played ·{" "}
                    <span className="text-orange-600 font-bold">{p.wins}W</span>{" "}
                    – {p.losses}L · {p.winRate}%
                  </span>
                </button>
              );
            })}
          </div>
          {selectedPair && (
            <MatchResultsPanel
              title={`${selectedPair.players.join(" & ")} matches`}
              matches={matchesForPair(filtered, selectedPair.players)}
            />
          )}
        </>
      )}
    </div>
  );
}

function AbandonedSection({ matches }) {
  const abandoned = computeAbandonedMatches(matches);
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
        <AlertTriangle size={13} className="text-amber-500" />
        Matches where neither side reached 21 points — treated as abandoned
        (rain, injury, court time, etc).
      </p>
      {abandoned.length === 0 ? (
        <p className="text-slate-400 text-sm">No abandoned matches recorded.</p>
      ) : (
        <div className="space-y-2">
          {abandoned.map((m) => (
            <div
              key={m.id}
              className="px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="text-slate-400 dark:text-slate-500 w-16 shrink-0">
                  {m.date}
                </span>
                <span className="flex-1 text-right text-slate-700 dark:text-slate-200">
                  {m.team1.join(" & ")}
                </span>
                <span className="font-bold shrink-0 bg-white dark:bg-slate-700 rounded px-1.5 py-0.5 text-slate-700 dark:text-slate-200">
                  {m.score1}-{m.score2}
                </span>
                <span className="flex-1 text-slate-700 dark:text-slate-200">
                  {m.team2.join(" & ")}
                </span>
              </div>
              {m.comment && (
                <p className="text-slate-600 dark:text-slate-300 italic font-medium mt-1">
                  "{m.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DueEditForm({ due, onSave, onCancel }) {
  const [count, setCount] = useState(String(due.count));
  const [comment, setComment] = useState(due.comment || "");
  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <input
        type="number"
        min={0}
        value={count}
        onChange={(e) => setCount(e.target.value)}
        className={`${dateCls} w-20`}
      />
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Comment"
        className={`${dateCls} flex-1 min-w-[8rem]`}
      />
      <button
        onClick={() => onSave({ count: Number(count) || 0, comment })}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition"
      >
        <Save size={12} /> Save
      </button>
      <button
        onClick={onCancel}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
      >
        <X size={12} /> Cancel
      </button>
    </div>
  );
}

function PartyDueSection({
  dues,
  players,
  canModify,
  onAdd,
  onUpdate,
  onDelete,
}) {
  const [form, setForm] = useState({
    name: players[0] || "",
    count: "",
    comment: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  function handleAdd(e) {
    e.preventDefault();
    if (!form.name) return;
    onAdd({
      name: form.name,
      count: Number(form.count) || 0,
      comment: form.comment.trim(),
    });
    setForm({ name: players[0] || "", count: "", comment: "" });
  }

  return (
    <div>
      {canModify && (
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
          <select
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={selectCls}
          >
            {players.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={form.count}
            onChange={(e) => setForm((f) => ({ ...f, count: e.target.value }))}
            placeholder="Count"
            className={`${dateCls} w-24`}
          />
          <input
            type="text"
            value={form.comment}
            onChange={(e) =>
              setForm((f) => ({ ...f, comment: e.target.value }))
            }
            placeholder="Comment (optional)"
            className={`${dateCls} flex-1 min-w-[10rem]`}
          />
          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700">
            <Plus size={15} /> Add
          </button>
        </form>
      )}
      {dues.length === 0 ? (
        <p className="text-slate-400 text-sm">No party dues recorded.</p>
      ) : (
        <div className="space-y-1.5">
          {dues.map((d) => (
            <div
              key={d.id}
              className="px-3 py-2 rounded-lg border dark:border-slate-700 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {d.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-orange-600 font-bold">{d.count}</span>
                  {canModify && editingId !== d.id && (
                    <>
                      <button
                        onClick={() => setEditingId(d.id)}
                        className="p-1 rounded text-slate-300 hover:text-orange-500"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setConfirm(d)}
                        className="p-1 rounded text-slate-300 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {d.comment && editingId !== d.id && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">
                  {d.comment}
                </p>
              )}
              {editingId === d.id && (
                <DueEditForm
                  due={d}
                  onCancel={() => setEditingId(null)}
                  onSave={(updates) => {
                    setEditingId(null);
                    onUpdate(d.id, updates);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!confirm}
        title="Delete this due?"
        message={
          confirm ? `The due entry for "${confirm.name}" will be removed.` : ""
        }
        confirmLabel="Delete"
        onConfirm={() => {
          onDelete(confirm.id);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

export default function Report({ data, actions, isSuperAdmin }) {
  const [tab, setTab] = useState("duo");
  const players = data.players;
  const matches = data.matches;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-4">
        <BarChart3 size={16} className="text-orange-600" /> Reports
      </h2>
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-full p-1 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition ${
              tab === t.key
                ? "bg-slate-900 dark:bg-orange-600 text-white"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <span className="sm:hidden">{t.shortLabel || t.label}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>
      {tab === "partyDue" ? (
        <PartyDueSection
          players={players}
          canModify={isSuperAdmin}
          onAdd={actions?.addDue}
          onUpdate={actions?.updateDue}
          onDelete={actions?.deleteDue}
        />
      ) : (
        <>
          {tab === "duo" && <DuoSection matches={matches} players={players} />}
          {tab === "combos" && (
            <CombosSection matches={matches} players={players} />
          )}
          {tab === "individual" && (
            <IndividualSection matches={matches} players={players} />
          )}
          {tab === "pairs" && <PairsSection matches={matches} />}
          {tab === "abandoned" && <AbandonedSection matches={matches} />}
        </>
      )}
    </div>
  );
}
