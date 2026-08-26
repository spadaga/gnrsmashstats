import { useState } from "react";
import { createPortal } from "react-dom";
import { Activity, Trophy } from "lucide-react";
import MatchesModal from "./MatchesModal";
import Avatar from "./Avatar";

function PlayersModal({ players, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm mt-8 p-5">
        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-4">
          Total Players{" "}
          <span className="text-slate-400 dark:text-slate-500 font-medium normal-case">
            ({players.length})
          </span>
        </h3>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {players.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <Avatar name={name} size="sm" />
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function StatCards({ matches, players }) {
  const [showMatches, setShowMatches] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const names = players.map((p) => (typeof p === "string" ? p : p.name));

  return (
    <div className="rounded-2xl bg-orange-600 text-white p-5 flex items-center justify-between gap-4 flex-wrap">
      <button
        type="button"
        onClick={() => setShowMatches(true)}
        className="flex items-center gap-3 text-left hover:opacity-90 transition"
      >
        <Activity size={32} className="text-orange-200 shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange-100">
            Total Matches
          </p>
          <p className="text-4xl font-extrabold mt-1">{matches.length}</p>
        </div>
      </button>
      <div className="w-px self-stretch bg-orange-400/40" />
      <button
        type="button"
        onClick={() => setShowPlayers(true)}
        className="flex items-center gap-3 text-left hover:opacity-90 transition"
      >
        <Trophy size={32} className="text-orange-200 shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-orange-100">
            Total Players
          </p>
          <p className="text-4xl font-extrabold mt-1">{players.length}</p>
        </div>
      </button>
      {showMatches && (
        <MatchesModal
          title="Matches in this period"
          matches={matches}
          onClose={() => setShowMatches(false)}
        />
      )}
      {showPlayers && (
        <PlayersModal players={names} onClose={() => setShowPlayers(false)} />
      )}
    </div>
  );
}
