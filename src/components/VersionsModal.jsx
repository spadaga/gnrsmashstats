import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Clock, RotateCcw, X } from "lucide-react";
import * as api from "../lib/api";
import ConfirmDialog from "./ConfirmDialog";
import { localISODate } from "../lib/date";

function formatTs(ts) {
  const dateStr = ts.slice(0, 10);
  const now = new Date();
  const today = localISODate(now);
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  const yesterday = localISODate(d);
  d.setDate(d.getDate() - 1);
  const dayBefore = localISODate(d);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  if (dateStr === dayBefore) return "Day Before Yesterday";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function VersionsModal({ open, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .getVersions()
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function doRestore(ts) {
    setConfirm(null);
    setLoading(true);
    try {
      await api.restoreVersion(ts);
      onRestored?.();
      onClose();
    } catch (e) {
      alert(e.message || "Restore failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" />
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-5">
            <span className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-orange-600" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Version History
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                3 daily snapshots — restore any day's state
              </p>
            </div>
          </div>
          {loading ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              Loading…
            </div>
          ) : versions.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              No snapshots yet. Snapshots are created automatically on the first
              write each day.
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.ts}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border dark:border-slate-700 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 dark:hover:border-orange-800 transition"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatTs(v.ts)}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {v.matchCount ?? "—"} matches · {v.playerCount ?? "—"}{" "}
                      players
                      {v.slotCount != null ? ` · ${v.slotCount} slots` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setConfirm(v.ts)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold transition"
                  >
                    <RotateCcw size={13} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="Restore this snapshot?"
        message="All current data will be replaced with this version. This cannot be undone."
        confirmLabel="Restore"
        danger={false}
        onConfirm={() => doRestore(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </>,
    document.body,
  );
}
