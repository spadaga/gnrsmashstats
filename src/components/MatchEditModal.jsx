import { useState, useEffect } from "react";
import { Save, X } from "lucide-react";
import PlayerPicker from "./PlayerPicker";
import { formatYoutubeUrl } from "../lib/ranking";

const MAX_SCORE = 30;

export default function MatchEditModal({
  match,
  players,
  onSave,
  onClose,
  photoByName = {},
}) {
  const [form, setForm] = useState({
    p1: match.team1[0] || "",
    p2: match.team1[1] || "",
    p3: match.team2[0] || "",
    p4: match.team2[1] || "",
    score1: String(match.score1),
    score2: String(match.score2),
    comment: match.comment || "",
    youtubeUrl: match.youtubeUrl || "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const selected = [form.p1, form.p2, form.p3, form.p4];
  function availableFor(slot) {
    return players.filter(
      (p) =>
        !selected.includes(p) ||
        selected.indexOf(p) === ["p1", "p2", "p3", "p4"].indexOf(slot),
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    const { p1, p2, p3, p4, score1, score2, comment, youtubeUrl } = form;
    const names = [p1, p2, p3, p4];
    if (names.some((n) => !n))
      return setError("All four players must be selected.");
    if (new Set(names).size < 4)
      return setError("All four players must be different.");

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

    onSave(match.id, {
      team1: [p1, p2],
      team2: [p3, p4],
      score1: s1,
      score2: s2,
      comment: comment.trim(),
      youtubeUrl: formatYoutubeUrl(youtubeUrl),
    });
  }

  const inputCls =
    "w-full border dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <form
        onSubmit={handleSubmit}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mt-8 p-6 space-y-4"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Edit Match
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
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
            />
            <PlayerPicker
              value={form.p2}
              onChange={(v) => set("p2", v)}
              options={availableFor("p2")}
              photoByName={photoByName}
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
            />
            <PlayerPicker
              value={form.p4}
              onChange={(v) => set("p4", v)}
              options={availableFor("p4")}
              photoByName={photoByName}
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
            Comment{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.comment}
            onChange={(e) => set("comment", e.target.value)}
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition"
          >
            <Save size={14} /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
