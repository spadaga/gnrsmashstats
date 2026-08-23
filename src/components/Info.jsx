import { useState } from "react";
import { Info as InfoIcon } from "lucide-react";
import { WilsonInfoModal } from "./WilsonInfoModal";

export default function Info() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Wilson Score Formula & Details"
        title="View Wilson Score Formula & Details"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-400 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:border-orange-500/60 dark:hover:bg-orange-950/40 dark:hover:text-orange-400"
      >
        <InfoIcon size={12} strokeWidth={2.5} />
      </button>

      <WilsonInfoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
