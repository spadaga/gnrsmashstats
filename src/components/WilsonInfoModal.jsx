import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Calculator,
  Calendar,
  Crown,
  Medal,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Video,
  X,
} from "lucide-react";

export function WilsonInfoModal({ open, onClose, defaultTab = "ranking" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 border dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                GNR SmashStats Guidelines & Ranking Info
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tab-wise Rankings, Top Seeds, and User Roles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("ranking")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "ranking"
                ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Medal size={14} /> Rankings & Top Seeds
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "roles"
                ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck size={14} /> User Roles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("formula")}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "formula"
                ? "bg-white dark:bg-slate-800 text-orange-600 dark:text-orange-400 shadow-xs"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Calculator size={14} /> Wilson Formula
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="max-h-[60vh] overflow-y-auto pr-1 text-xs text-slate-600 dark:text-slate-300 space-y-3">
          {/* TAB 1: RANKINGS & TOP SEEDS TAB-WISE */}
          {activeTab === "ranking" && (
            <div className="space-y-3">
              <div className="bg-orange-50/70 dark:bg-orange-950/30 p-3 rounded-xl border border-orange-100 dark:border-orange-900/40 text-orange-900 dark:text-orange-200">
                <p className="font-semibold text-xs mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-orange-600" />
                  Core Regular Players Priority
                </p>
                <p className="text-[11px] leading-relaxed">
                  In <strong>Weekly, Monthly, Yearly, and Overall</strong>{" "}
                  views, regular players (
                  <strong>
                    Suresh Padaga, Srinivas Padaga, Sanjeev Kumar, Abdhulla, HR,
                    Narender, Manikyam
                  </strong>
                  ) who meet the 10-match threshold appear first in the rankings
                  based on their Wilson score, followed by other players.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Today */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar size={13} className="text-orange-500" /> Today
                      Tab
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                      Min 3 Matches
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                    <li>
                      Filters matches played on <strong>today only</strong>.
                    </li>
                    <li>
                      Players with ≥ 3 matches qualify for official ranking.
                    </li>
                    <li>Ranked strictly by Wilson score interval.</li>
                    <li>
                      <strong>Top Seeds:</strong> Top 2 singles & top 2 doubles
                      from today's games.
                    </li>
                  </ul>
                </div>

                {/* Sunday */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Calendar size={13} className="text-orange-500" /> Sunday
                      Tab
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                      Min 3 Matches
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                    <li>
                      Considers <strong>all historical Sunday matches</strong>.
                    </li>
                    <li>
                      Players with ≥ 3 Sunday matches qualify for official
                      ranking.
                    </li>
                    <li>Ranked by Wilson score across all Sunday battles.</li>
                    <li>
                      <strong>Top Seeds:</strong> All-time Sunday singles &
                      doubles leaders.
                    </li>
                  </ul>
                </div>

                {/* Weekly */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Medal size={13} className="text-orange-500" /> Weekly Tab
                      & Week Ribbon
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      2-Tier Smart Ribbon
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                    <li>
                      <strong>All Week (Entire Week):</strong> Aggregates week
                      matches (min 10 matches, regular players ranked first).
                    </li>
                    <li>
                      <strong>Day Breakdown (Sun–Sat):</strong> Tap any
                      individual day in the Ribbon to see matches and rankings
                      for that exact day (min 3 matches, Wilson score).
                    </li>
                    <li>
                      <strong>Top Seeds:</strong> Shows week champions or top
                      performers for the selected day.
                    </li>
                  </ul>
                </div>

                {/* Monthly */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Medal size={13} className="text-orange-500" /> Monthly
                      Tab
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      Min 10 Matches
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                    <li>
                      Considers <strong>Monday–Saturday matches</strong> of
                      current month.
                    </li>
                    <li>Requires 10 matches to qualify.</li>
                    <li>Regular players ranked first by Wilson score.</li>
                    <li>
                      <strong>Top Seeds:</strong> Month's top regular player &
                      top duo.
                    </li>
                  </ul>
                </div>

                {/* Yearly */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Trophy size={13} className="text-orange-500" /> Yearly
                      Tab
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      Min 10 Matches
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                    <li>
                      Considers <strong>Monday–Saturday matches</strong> of
                      current year.
                    </li>
                    <li>Requires 10 matches to qualify.</li>
                    <li>Regular players ranked first by Wilson score.</li>
                    <li>
                      <strong>Top Seeds:</strong> Annual top seeds and champion
                      pairs.
                    </li>
                  </ul>
                </div>

                {/* Overall */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border dark:border-slate-700 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Crown size={13} className="text-orange-500" /> Overall
                      Tab
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      Min 10 Matches
                    </span>
                  </div>
                  <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
                    <li>
                      Considers{" "}
                      <strong>all historical Monday–Saturday matches</strong>.
                    </li>
                    <li>Requires 10 matches to qualify.</li>
                    <li>Regular players ranked first by Wilson score.</li>
                    <li>
                      <strong>Top Seeds:</strong> All-time top player & doubles
                      duo.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER ROLES & PERMISSIONS */}
          {activeTab === "roles" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Each member is assigned a specific role defining what actions
                they can perform on the platform:
              </p>

              <div className="space-y-2.5">
                {/* Super Admin */}
                <div className="p-3 rounded-xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                        <Crown size={11} /> Super Admin
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        Suresh Padaga
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Full System Control:</strong> Manage player roles,
                    change PINs, delete matches, edit scores, add/update YouTube
                    video URLs, court slots management, party dues, player
                    avatars, snapshot backup and restore.
                  </p>
                </div>

                {/* Score & Video Editor */}
                <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                        <ShieldCheck size={11} /> Score & Video Editor
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        Srinivas Padaga
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Score & Video Rights:</strong> Authorized to modify
                    match scores and add/edit YouTube match video URLs. Cannot
                    delete matches or change system roles.
                  </p>
                </div>

                {/* Video Editor */}
                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <Video size={11} /> Video Editor
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        Sanjeev Kumar, Abdhulla
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Video Rights:</strong> Authorized to add, edit, or
                    update YouTube video links on matches and manage the video
                    gallery. Cannot modify match scores or delete matches.
                  </p>
                </div>

                {/* Match Logger */}
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <Shield size={11} /> Match Logger
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        Narendra, HR
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Match Entry Rights:</strong> Authorized to log new
                    doubles matches into the platform.
                  </p>
                </div>

                {/* Contributor / Player */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center gap-1">
                        <Users size={11} /> Contributor
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-xs">
                        Manikyam, Diwakar, and all other members
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    <strong>Standard Access:</strong> View live leaderboards,
                    Top Seeds, personal player profile history, head-to-head
                    records, court slots, and analytics reports.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WILSON SCORE FORMULA */}
          {activeTab === "formula" && (
            <div className="space-y-3.5">
              <p className="leading-relaxed">
                Rankings and Top Seeds are computed using the{" "}
                <strong>Wilson Score Interval</strong> (lower bound of the 95%
                confidence interval for a Bernoulli parameter). It measures
                statistical confidence in a player's true win rate rather than
                simple win percentage.
              </p>

              {/* Mathematical Formula Display */}
              <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border dark:border-slate-700 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Mathematical Formula
                </p>
                <div className="font-mono text-xs sm:text-sm text-orange-600 dark:text-orange-400 text-center font-extrabold bg-white dark:bg-slate-800 p-2.5 rounded-lg border dark:border-slate-700 shadow-xs select-all overflow-x-auto whitespace-nowrap">
                  Score = (p̂ + z²/2n - z · √[ p̂(1-p̂)/n + z²/4n² ]) / (1 + z²/n)
                </div>
              </div>

              {/* Variable Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border dark:border-slate-700">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    p̂ (p-hat):
                  </span>{" "}
                  Observed win rate (<code>wins / played</code>)
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    n:
                  </span>{" "}
                  Matches played in the period
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    z:
                  </span>{" "}
                  1.96 (for 95% statistical confidence)
                </div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Output:
                  </span>{" "}
                  Confidence score between 0.000 and 1.000
                </div>
              </div>

              {/* Why Wilson Score */}
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <Sparkles size={13} className="text-orange-500 shrink-0" />{" "}
                  Why use Wilson Score?
                </h4>
                <ul className="space-y-1 text-slate-500 dark:text-slate-400 list-disc pl-4">
                  <li>
                    <strong className="text-slate-700 dark:text-slate-200">
                      Fairness:
                    </strong>{" "}
                    Prevents a player with 1 win in 1 match (100%) from
                    outranking a proven player with 18 wins in 22 matches
                    (81.8%).
                  </li>
                  <li>
                    <strong className="text-slate-700 dark:text-slate-200">
                      Sample Size Confidence:
                    </strong>{" "}
                    As more matches are played, the confidence interval narrows
                    and the score approaches the true win percentage.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t dark:border-slate-700/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default WilsonInfoModal;
