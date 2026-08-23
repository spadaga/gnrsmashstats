import { useEffect } from "react";
import { Calculator, Sparkles, X } from "lucide-react";

export function WilsonInfoModal({ open, onClose }) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 border dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150 my-auto">
        <div className="flex items-center justify-between border-b dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <Calculator size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Wilson Score Ranking Formula
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Confidence-adjusted ranking system
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-300 max-h-[70vh] overflow-y-auto pr-1">
          <p className="leading-relaxed">
            Rankings and Top Seeds are calculated using the{" "}
            <strong>Wilson Score Interval</strong> (lower bound of the 95%
            confidence interval for a Bernoulli parameter). It measures
            statistical confidence in a player's true win rate rather than simple
            percentages.
          </p>

          {/* Mathematical Formula Display */}
          <div className="bg-slate-50 dark:bg-slate-900/80 p-3.5 rounded-xl border dark:border-slate-700 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Mathematical Formula
            </p>
            <div className="font-mono text-xs sm:text-sm text-orange-600 dark:text-orange-400 text-center font-extrabold bg-white dark:bg-slate-800 p-2.5 rounded-lg border dark:border-slate-700 shadow-sm select-all overflow-x-auto whitespace-nowrap">
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
              <Sparkles size={13} className="text-orange-500 shrink-0" /> Why use
              Wilson Score?
            </h4>
            <ul className="space-y-1 text-slate-500 dark:text-slate-400 list-disc pl-4">
              <li>
                <strong className="text-slate-700 dark:text-slate-200">
                  Fairness:
                </strong>{" "}
                Prevents a player with 1 win in 1 match (100%) from outranking a
                proven player with 15 wins in 18 matches (83.3%).
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-200">
                  Sample Size Confidence:
                </strong>{" "}
                As more matches are played, the confidence interval narrows and
                the score approaches the true win percentage.
              </li>
            </ul>
          </div>

          {/* Period Rules */}
          <div className="space-y-1.5 pt-1 border-t dark:border-slate-700/60">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">
              Period & Match Filtering Rules:
            </h4>
            <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <p>
                •{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  Sunday Tab:
                </strong>{" "}
                Calculates Wilson score across all historical Sunday matches.
              </p>
              <p>
                •{" "}
                <strong className="text-slate-700 dark:text-slate-200">
                  Week / Month / Year / Overall:
                </strong>{" "}
                Excludes Sunday matches to calculate rankings strictly among regular
                Monday–Saturday players.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t dark:border-slate-700/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default WilsonInfoModal;
