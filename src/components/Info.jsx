import { Info as InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./Tooltip";

export default function Info({ children }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="More information"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300 dark:hover:border-orange-500/60 dark:hover:bg-orange-950/40 dark:hover:text-orange-400 dark:focus-visible:ring-offset-slate-800"
          >
            <InfoIcon size={14} strokeWidth={2.25} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{children}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
