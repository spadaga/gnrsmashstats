import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import * as api from "./lib/api";
import {
  playerNames,
  photoMap,
  isSuperAdmin as isSuperAdminCheck,
  canLogMatch,
  canEditScore,
  canManageVideoUrls,
} from "./lib/admins";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import LogMatch from "./pages/LogMatch";
import Players from "./pages/Players";
import Slots from "./pages/Slots";
import Report from "./pages/Report";
import PlayerProfile from "./pages/PlayerProfile";
import LoginModal from "./components/LoginModal";
import VersionsModal from "./components/VersionsModal";
import Footer from "./components/Footer";

// Initialise dark mode from localStorage before first paint
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") document.documentElement.classList.add("dark");
else document.documentElement.classList.remove("dark");

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [profilePlayer, setProfilePlayer] = useState(null);
  const [profileFrom, setProfileFrom] = useState("dashboard");
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [adminName, setAdminName] = useState(
    () => localStorage.getItem("adminName") || null,
  );
  const [loginOpen, setLoginOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  const loadState = () => {
    setLoadError(null);
    api
      .getState()
      .then(setData)
      .catch((error) => setLoadError(error.message));
  };

  useEffect(loadState, []);

  // Each navigation behaves like a new page, even though this is a single-page app.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [page]);

  // Light polling so a match logged/edited on one device shows up on other
  // devices without a manual refresh. No WebSocket infra needed at this
  // scale — just re-fetch and swap in the latest state.
  useEffect(() => {
    const id = setInterval(() => {
      if (busy) return; // don't clobber an in-flight optimistic update
      api
        .getState()
        .then(setData)
        .catch(() => {}); // silent — transient poll failures shouldn't blank the app
    }, 10000);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  function withFeedback(promise, successMessage) {
    setBusy(true);
    return promise
      .then((result) => {
        setToast({ type: "success", message: successMessage });
        return result;
      })
      .catch((err) => {
        setToast({
          type: "error",
          message: err.message || "Something went wrong",
        });
        throw err;
      })
      .finally(() => setBusy(false));
  }

  async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      setData(await withFeedback(api.importAll(json), "Data imported"));
    } catch {
      setToast({ type: "error", message: "Invalid JSON file." });
    }
    e.target.value = "";
  }

  function handleLogin(name) {
    setAdminName(name);
    localStorage.setItem("adminName", name);
    setLoginOpen(false);
    setToast({ type: "success", message: `Welcome, ${name}!` });
  }

  function viewProfile(name) {
    setProfileFrom(page);
    setProfilePlayer(name);
    setPage("profile");
  }

  function handleLogout() {
    setAdminName(null);
    localStorage.removeItem("adminName");
    setToast({ type: "success", message: "Logged out" });
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6 dark:bg-slate-900">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-lg dark:bg-slate-800">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Unable to load data
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {loadError}
          </p>
          <button
            onClick={loadState}
            className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
        <Loader2 size={20} className="animate-spin" /> Loading…
      </div>
    );
  }

  const names = playerNames(data.players);
  const photoByName = photoMap(data.players);
  // Suresh Padaga gets elevated rights: view history, edit/delete matches from any day.
  // Keyed on name, not PIN — PINs are meant to be changeable, so a super admin who
  // updates their own PIN must not lose access.
  const isSuperAdmin = isSuperAdminCheck(adminName);
  const canLog = canLogMatch(adminName, data.players);
  const canEditScoreUser = canEditScore(adminName, data.players);
  const canManageVideosUser = canManageVideoUrls(adminName, data.players);

  const actions = {
    addPlayer: (name) =>
      withFeedback(
        api
          .addPlayer(name)
          .then((players) => setData((d) => ({ ...d, players }))),
        "Player added",
      ),
    deletePlayer: (name) =>
      withFeedback(
        api
          .deletePlayer(name)
          .then((players) => setData((d) => ({ ...d, players }))),
        "Player removed",
      ),
    updatePlayer: (name, updates) =>
      withFeedback(
        api
          .updatePlayer(name, updates)
          .then((players) => setData((d) => ({ ...d, players }))),
        "Player updated",
      ),
    addMatch: (match) =>
      withFeedback(
        api
          .addMatch(match)
          .then((matches) => setData((d) => ({ ...d, matches }))),
        "Match logged",
      ),
    deleteMatch: (id) =>
      withFeedback(
        api
          .deleteMatch(id)
          .then((matches) => setData((d) => ({ ...d, matches }))),
        "Match deleted",
      ),
    updateMatch: (id, updates) =>
      withFeedback(
        api
          .updateMatch(id, updates)
          .then((matches) => setData((d) => ({ ...d, matches }))),
        "Match updated",
      ),
    addVideo: (url) =>
      withFeedback(
        api.addVideo(url).then((videos) => setData((d) => ({ ...d, videos }))),
        "Video added",
      ),
    deleteVideo: (index) =>
      withFeedback(
        api
          .deleteVideo(index)
          .then((videos) => setData((d) => ({ ...d, videos }))),
        "Video removed",
      ),
    addPhoto: (dataUrl) =>
      withFeedback(
        api
          .addPhoto(dataUrl)
          .then((photos) => setData((d) => ({ ...d, photos }))),
        "Photo uploaded",
      ),
    deletePhoto: (id) =>
      withFeedback(
        api
          .deletePhoto(id)
          .then((photos) => setData((d) => ({ ...d, photos }))),
        "Photo deleted",
      ),
    addSlot: (slot) =>
      withFeedback(
        api.addSlot(slot).then((slots) => setData((d) => ({ ...d, slots }))),
        "Slot added",
      ),
    updateSlot: (id, updates) =>
      withFeedback(
        api
          .updateSlot(id, updates)
          .then((slots) => setData((d) => ({ ...d, slots }))),
        "Slot updated",
      ),
    deleteSlot: (id) =>
      withFeedback(
        api.deleteSlot(id).then((slots) => setData((d) => ({ ...d, slots }))),
        "Slot deleted",
      ),
    addDue: (due) =>
      withFeedback(
        api.addDue(due).then((dues) => setData((d) => ({ ...d, dues }))),
        "Due added",
      ),
    updateDue: (id, updates) =>
      withFeedback(
        api
          .updateDue(id, updates)
          .then((dues) => setData((d) => ({ ...d, dues }))),
        "Due updated",
      ),
    deleteDue: (id) =>
      withFeedback(
        api.deleteDue(id).then((dues) => setData((d) => ({ ...d, dues }))),
        "Due deleted",
      ),
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header
        page={page}
        onNavigate={setPage}
        isAdmin={canLog}
        adminName={adminName}
        canViewHistory={isSuperAdmin}
        onLoginClick={() => setLoginOpen(true)}
        onLogout={handleLogout}
        dark={dark}
        onToggleDark={toggleDark}
        onVersionsClick={() => setVersionsOpen(true)}
      />

      {busy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl px-6 py-4">
            <Loader2 size={22} className="animate-spin text-orange-600" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Saving…
            </span>
          </div>
        </div>
      )}
      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-full text-sm font-medium text-white shadow-lg ${
            toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-3 py-3">
        {page === "dashboard" && (
          <Dashboard
            data={{ ...data, players: names }}
            actions={actions}
            onNavigate={setPage}
            onImport={handleImport}
            isAdmin={canLog}
            isSuperAdmin={isSuperAdmin}
            canEditScore={canEditScoreUser}
            canEditVideo={canManageVideosUser}
            photoByName={photoByName}
            onViewProfile={viewProfile}
          />
        )}
        {page === "log" && canLog && (
          <LogMatch
            players={names}
            matches={data.matches}
            actions={actions}
            onNavigate={setPage}
            photoByName={photoByName}
          />
        )}
        {page === "players" && (
          <Players
            players={data.players}
            actions={actions}
            isAdmin={isSuperAdmin}
            onViewProfile={viewProfile}
          />
        )}
        {page === "slots" && (
          <Slots slots={data.slots} actions={actions} isAdmin={isSuperAdmin} />
        )}
        {page === "report" && (
          <Report
            data={{ matches: data.matches, players: names, dues: data.dues }}
            actions={actions}
            isAdmin={canLog}
            isSuperAdmin={isSuperAdmin}
          />
        )}
        {page === "profile" && profilePlayer && (
          <PlayerProfile
            playerName={profilePlayer}
            players={data.players}
            matches={data.matches}
            slots={data.slots}
            dues={data.dues}
            onBack={() => setPage(profileFrom)}
            adminName={adminName}
          />
        )}
      </main>

      <Footer />

      <LoginModal
        open={loginOpen}
        players={data.players}
        onLogin={handleLogin}
        onClose={() => setLoginOpen(false)}
      />
      <VersionsModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        onRestored={(state) => {
          setData(state);
          setVersionsOpen(false);
        }}
      />
    </div>
  );
}
