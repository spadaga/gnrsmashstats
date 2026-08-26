import { useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarClock,
  Clock,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Phone,
  Plus,
  ShieldCheck,
  Sun,
  Trophy,
  Users,
  X,
} from "lucide-react";
import WilsonInfoModal from "./WilsonInfoModal";

const NAV_DESKTOP = [
  { key: "dashboard", label: "Dashboard" },
  { key: "log", label: "Log Match", icon: Plus, adminOnly: true },
  { key: "players", label: "Players", icon: Users },
  { key: "slots", label: "Court Slots", icon: CalendarClock },
  { key: "report", label: "Report", icon: BarChart3 },
];

function Logo() {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <span className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
        <Activity size={16} />
      </span>
    );
  }
  return (
    <span className="group relative shrink-0">
      <img
        src="/logo.jpeg"
        alt="GNR SmashStats logo"
        onError={() => setBroken(true)}
        className="w-8 h-8 rounded-lg object-cover"
      />
      <img
        src="/logo.jpeg"
        alt=""
        className="pointer-events-none absolute left-0 top-full mt-2 w-40 h-40 rounded-xl object-cover shadow-2xl ring-1 ring-black/10 opacity-0 scale-95 origin-top-left transition duration-150 group-hover:opacity-100 group-hover:scale-100 z-50"
      />
    </span>
  );
}

export default function Header({
  page,
  onNavigate,
  isAdmin,
  adminName,
  canViewHistory,
  onLoginClick,
  onLogout,
  dark,
  onToggleDark,
  onVersionsClick,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  function nav(key) {
    onNavigate(key);
    setMenuOpen(false);
  }

  return (
    <header className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* Logo */}
        <button
          onClick={() => nav("dashboard")}
          className="flex items-center gap-2 text-left shrink-0"
        >
          <Logo />
          <span className="leading-tight hidden sm:block">
            <span className="block text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
              GNR SMASH<span className="text-orange-600">STATS</span>
            </span>
            <span className="block text-[9px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Gentlemen Play Here
            </span>
          </span>
          <span className="sm:hidden font-extrabold tracking-tight text-slate-900 dark:text-white text-sm">
            GNR<span className="text-orange-600">SS</span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-wrap flex-1 justify-end">
          {NAV_DESKTOP.filter(({ adminOnly }) => !adminOnly || isAdmin).map(
            ({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => nav(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  page === key
                    ? "bg-orange-600 text-white"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {Icon && <Icon size={14} />}
                {label}
              </button>
            ),
          )}
          {canViewHistory && (
            <button
              onClick={onVersionsClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              <Clock size={14} /> History
            </button>
          )}
          <button
            onClick={() => setInfoOpen(true)}
            title="Rankings, Top Seeds & Roles Guidelines"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 dark:hover:text-orange-400 transition"
          >
            <Trophy size={14} className="text-orange-500" /> Rankings Info
          </button>
          <a
            href="tel:7569475439"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Phone size={13} /> Bhavani
          </a>
          <button
            onClick={onToggleDark}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          {isAdmin ? (
            <div className="flex items-center gap-2 ml-1">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-xs font-semibold text-orange-700 dark:text-orange-400">
                <ShieldCheck size={13} /> {adminName}
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <LogOut size={13} /> Logout
              </button>
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-orange-600 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition ml-1"
            >
              <LogIn size={13} /> Admin Login
            </button>
          )}
        </nav>

        {/* Mobile right-side controls */}
        <div className="md:hidden flex items-center gap-1.5">
          <button
            onClick={() => setInfoOpen(true)}
            title="Rankings, Top Seeds & Roles Guidelines"
            className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 hover:text-orange-600 dark:hover:text-orange-400 transition"
          >
            <Trophy size={16} className="text-orange-500" />
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => nav("log")}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold transition ${
                  page === "log"
                    ? "bg-orange-600 text-white"
                    : "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800"
                }`}
              >
                <Plus size={12} /> Log
              </button>
              <span className="text-xs font-semibold text-orange-700 dark:text-orange-400 max-w-[80px] truncate">
                {adminName}
              </span>
            </>
          )}
          {!isAdmin && (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-orange-600 border border-orange-200 dark:border-orange-800 hover:bg-orange-50 transition"
            >
              <LogIn size={12} /> Login
            </button>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 space-y-1">
          <button
            onClick={() => nav("dashboard")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${page === "dashboard" ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => nav("players")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${page === "players" ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
          >
            <Users size={15} /> Players
          </button>
          <button
            onClick={() => nav("slots")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${page === "slots" ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
          >
            <CalendarClock size={15} /> Court Slots
          </button>
          <button
            onClick={() => nav("report")}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${page === "report" ? "bg-orange-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"}`}
          >
            <BarChart3 size={15} /> Report
          </button>
          <button
            onClick={() => {
              setInfoOpen(true);
              setMenuOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Trophy size={15} className="text-orange-500" /> Rankings & Roles
            Info
          </button>
          {canViewHistory && (
            <button
              onClick={() => {
                onVersionsClick();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <Clock size={15} /> Version History
            </button>
          )}
          <a
            href="tel:7569475439"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <Phone size={15} /> Call Bhavani
          </a>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {dark ? "Dark Mode" : "Light Mode"}
            </span>
            <button
              onClick={onToggleDark}
              className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                onLogout();
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <LogOut size={15} /> Logout
            </button>
          )}
        </div>
      )}

      <WilsonInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </header>
  );
}
