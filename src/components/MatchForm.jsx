import { useState } from "react";
import PlayerPicker from "./PlayerPicker";
import ConfirmDialog from "./ConfirmDialog";
import { localISODate } from "../lib/date";

const today = () => localISODate();
const MAX_SCORE = 30;

const empty = () => ({
  date: today(),
  p1: "",
  p2: "",
  p3: "",
  p4: "",
  score1: "",
  score2: "",
  comment: "",
  youtubeUrl: "",
});

const pairKey = (t) => [...t].sort().join("|");
function isSamePairing(m, t1, t2) {
  const a = [pairKey(t1), pairKey(t2)].sort().join("||");
  const b = [pairKey(m.team1), pairKey(m.team2)].sort().join("||");
  return a === b;
}

export default function MatchForm({
  players,
  matches = [],
  onAddMatch,
  photoByName = {},
}) {
  const [form, setForm] = useState(empty());
  const [error, setError] = useState("");
  const [pendingMatch, setPendingMatch] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // Players already selected in other slots (for filtering dropdowns)
  const selected = [form.p1, form.p2, form.p3, form.p4];

  function availableFor(slot) {
    return players.filter(
      (p) =>
        !selected.includes(p) ||
        selected.indexOf(p) === ["p1", "p2", "p3", "p4"].indexOf(slot),
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { p1, p2, p3, p4, score1, score2, comment, youtubeUrl } = form;
    const date = form.date;

    // Date validation — no future dates
    if (date > today()) return setError("Match date cannot be in the future.");

    const names = [p1, p2, p3, p4];
    if (names.some((n) => !n))
      return setError("All four players must be selected.");

    // All 4 must be unique
    const unique = new Set(names);
    if (unique.size < 4) return setError("All four players must be different.");

    const s1 = Number(score1),
      s2 = Number(score2);
    if (
      !Number.isInteger(s1) ||
      !Number.isInteger(s2) ||
      s1 < 0 ||
      s1 > MAX_SCORE ||
      s2 < 0 ||
      s2 > MAX_SCORE
    ) {
      return setError(
        `Scores must be whole numbers between 0 and ${MAX_SCORE}.`,
      );
    }
    if (s1 === s2) return setError("Scores cannot be tied.");

    const payload = {
      date,
      team1: [p1, p2],
      team2: [p3, p4],
      score1: s1,
      score2: s2,
      comment: comment.trim(),
      youtubeUrl: formatYoutubeUrl(youtubeUrl),
    };
    const duplicate = matches.some(
      (m) => m.date === date && isSamePairing(m, [p1, p2], [p3, p4]),
    );
    if (duplicate) {
      setPendingMatch(payload);
      return;
    }

    await submitMatch(payload);
  }

  async function submitMatch(payload) {
    await onAddMatch(payload);
    setForm(empty());
    setError("");
  }

  const inputCls =
    "w-full border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4 sm:p-6 space-y-4"
    >
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
        Log Match
      </h2>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
          Date
        </label>
        <input
          type="date"
          value={form.date}
          max={today()}
          onChange={(e) => set("date", e.target.value)}
          className={inputCls}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Team 1
          </legend>
          <PlayerPicker
            value={form.p1}
            onChange={(v) => set("p1", v)}
            options={availableFor("p1")}
            photoByName={photoByName}
            placeholder="Player 1"
          />
          <PlayerPicker
            value={form.p2}
            onChange={(v) => set("p2", v)}
            options={availableFor("p2")}
            photoByName={photoByName}
            placeholder="Player 2"
          />
          <input
            type="number"
            min={0}
            max={MAX_SCORE}
            value={form.score1}
            onChange={(e) => set("score1", e.target.value)}
            placeholder={`Score (0-${MAX_SCORE})`}
            className={inputCls}
            required
          />
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Team 2
          </legend>
          <PlayerPicker
            value={form.p3}
            onChange={(v) => set("p3", v)}
            options={availableFor("p3")}
            photoByName={photoByName}
            placeholder="Player 3"
          />
          <PlayerPicker
            value={form.p4}
            onChange={(v) => set("p4", v)}
            options={availableFor("p4")}
            photoByName={photoByName}
            placeholder="Player 4"
          />
          <input
            type="number"
            min={0}
            max={MAX_SCORE}
            value={form.score2}
            onChange={(e) => set("score2", e.target.value)}
            placeholder={`Score (0-${MAX_SCORE})`}
            className={inputCls}
            required
          />
        </fieldset>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
          Comment <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={form.comment}
          onChange={(e) => set("comment", e.target.value)}
          placeholder="Any notes about this match..."
          rows={2}
          className={inputCls + " resize-none"}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
          YouTube Link{" "}
          <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={form.youtubeUrl}
          onChange={(e) => set("youtubeUrl", e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className={inputCls}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        className="w-full sm:w-auto px-5 py-2 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 transition"
      >
        Save Match
      </button>

      <ConfirmDialog
        open={!!pendingMatch}
        title="Duplicate matchup?"
        danger={false}
        message="This exact team1-vs-team2 pairing already has a match logged today. Log it anyway?"
        confirmLabel="Log anyway"
        onConfirm={async () => {
          const m = pendingMatch;
          setPendingMatch(null);
          await submitMatch(m);
        }}
        onCancel={() => setPendingMatch(null)}
      />
    </form>
  );
}
