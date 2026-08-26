import { useState } from "react";
import {
  Camera,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import Avatar from "../components/Avatar";
import { isSuperAdmin, getPlayerRole } from "../lib/admins";
import YoutubeIcon from "../components/YoutubeIcon";

const MAX_AVATAR_DIMENSION = 300; // px, longest side
const MAX_AVATAR_BYTES = 150 * 1024;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Same downscale-then-recompress approach as PhotoGallery's prepareUpload, just
// tuned much smaller since it's only ever shown as a small avatar circle.
async function prepareAvatar(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return readAsDataURL(file);
  }
  const scale = Math.min(
    1,
    MAX_AVATAR_DIMENSION / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const quality of [0.85, 0.7, 0.6, 0.5]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const bytes = Math.ceil((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);
    if (bytes <= MAX_AVATAR_BYTES) return dataUrl;
  }
  return canvas.toDataURL("image/jpeg", 0.5);
}

// Avatar circle doubling as the upload target: shows the player's photo or an
// initials circle, with a hover camera overlay (admin only) to change it and
// a small red x to clear it back to initials.
function PlayerAvatarPicker({ name, photo, isAdmin, onChange, onClear }) {
  async function handleFile(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    onChange(await prepareAvatar(file));
  }
  if (!isAdmin) return <Avatar name={name} photo={photo} size="md" />;
  return (
    <div className="relative group shrink-0">
      <Avatar name={name} photo={photo} size="md" />
      <label
        className="absolute inset-0 rounded-full flex items-center justify-center cursor-pointer bg-black/0 group-hover:bg-black/40 transition"
        title="Change photo"
      >
        <Camera
          size={13}
          className="text-white opacity-0 group-hover:opacity-100 transition"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      {photo && (
        <button
          type="button"
          onClick={onClear}
          title="Remove photo"
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

function EditPlayerForm({ player, onSave, onCancel }) {
  const pName = typeof player === "string" ? player : player.name;
  const pPin = typeof player === "object" ? player.pin || "" : "";
  const [name, setName] = useState(pName);
  const [pin, setPin] = useState(pPin);
  const [err, setErr] = useState("");

  function handleSave() {
    if (!name.trim()) return setErr("Name cannot be empty.");
    if (pin && !/^d{4}$/.test(pin))
      return setErr("PIN must be exactly 4 digits.");
    onSave(pName, { name: name.trim(), pin: pin || undefined });
  }
  const inp =
    "flex-1 border dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400";
  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex gap-2 flex-wrap">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErr("");
          }}
          placeholder="Player name"
          className={inp}
        />
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setErr("");
          }}
          placeholder="PIN (4 digits)"
          maxLength={4}
          className="w-28 border dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition"
        >
          <Save size={12} /> Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          <X size={12} /> Cancel
        </button>
      </div>
      {err && <p className="text-xs text-red-500">{err}</p>}
    </div>
  );
}

export default function Players({ players, actions, isAdmin, onViewProfile }) {
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [editingName, setEditingName] = useState(null);

  function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    actions.addPlayer(name.trim());
    setName("");
  }

  function handleSaveEdit(oldName, updates) {
    setEditingName(null);
    actions.updatePlayer(oldName, updates);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {isAdmin && (
        <form
          onSubmit={handleAdd}
          className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New player name"
            className="flex-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700">
            <UserPlus size={15} /> Add
          </button>
        </form>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300 mb-3">
          Players ({players.length})
        </h2>
        <div className="space-y-1">
          {players.map((p) => {
            const playerName = typeof p === "string" ? p : p.name;
            const playerPhoto = typeof p === "object" ? p.photo : undefined;
            const isSuperAdminPlayer = isSuperAdmin(playerName);
            const role = getPlayerRole(p);
            const isEditing = editingName === playerName;
            return (
              <div
                key={playerName}
                className="px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PlayerAvatarPicker
                      name={playerName}
                      photo={playerPhoto}
                      isAdmin={isAdmin}
                      onChange={(photo) =>
                        actions.updatePlayer(playerName, { photo })
                      }
                      onClear={() =>
                        actions.updatePlayer(playerName, { photo: "" })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => onViewProfile?.(playerName)}
                      className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-orange-600 dark:hover:text-orange-400 hover:underline transition"
                    >
                      {playerName}
                    </button>
                    {isSuperAdminPlayer || role === "admin" ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded-full">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    ) : role === "score_editor" ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full">
                        <Pencil size={10} /> Score & Video
                      </span>
                    ) : role === "video_editor" ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded-full">
                        <YoutubeIcon size={12} /> Video Editor
                      </span>
                    ) : role === "match_logger" ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-full">
                        <UserPlus size={10} /> Match Logger
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded-full">
                        Contributor
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && !isSuperAdminPlayer && (
                      <select
                        value={role}
                        onChange={(e) =>
                          actions.updatePlayer(playerName, {
                            role:
                              e.target.value === "contributor"
                                ? ""
                                : e.target.value,
                          })
                        }
                        className="text-[11px] font-semibold rounded-lg border dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-400 cursor-pointer"
                        title="Change player role"
                      >
                        <option value="contributor">Contributor</option>
                        <option value="match_logger">Match Logger</option>
                        <option value="video_editor">Video Editor</option>
                        <option value="score_editor">
                          Score & Video Editor
                        </option>
                        <option value="admin">Admin</option>
                      </select>
                    )}
                    {isAdmin && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingName(playerName)}
                          className="p-1.5 text-slate-300 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition"
                          title="Edit player"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setConfirm(playerName)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                          title="Delete player"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <EditPlayerForm
                    player={p}
                    onSave={handleSaveEdit}
                    onCancel={() => setEditingName(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <ConfirmDialog
        open={!!confirm}
        title="Remove player?"
        message={`"${confirm}" will be removed from the player list.`}
        confirmLabel="Remove"
        onConfirm={() => {
          actions.deletePlayer(confirm);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
