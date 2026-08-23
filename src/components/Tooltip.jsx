import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

const TooltipContext = createContext();

export function TooltipProvider({ children }) {
  return children;
}

export function Tooltip({ children }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <TooltipContext.Provider value={{ id, open, setOpen }}>
      <div ref={rootRef} className="relative inline-flex">{children}</div>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children }) {
  const { id, open, setOpen } = useContext(TooltipContext);
  const trigger = React.Children.only(children);
  return React.cloneElement(trigger, {
    "aria-describedby": open ? id : undefined,
    "aria-expanded": open,
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    onClick: () => setOpen(true),
    onKeyDown: (event) => {
      if (event.key === "Escape") setOpen(false);
    },
  });
}

export function TooltipContent({ children, className = "" }) {
  const { id, open } = useContext(TooltipContext);
  if (!open) return null;

  return (
    <div
      id={id}
      role="tooltip"
      className={`absolute bottom-full left-1/2 z-50 mb-3 w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-600 shadow-xl shadow-slate-900/10 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:shadow-black/30 ${className}`}
    >
      {children}
      <span className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800" />
    </div>
  );
}
