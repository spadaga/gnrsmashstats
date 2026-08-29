import { useState } from "react";
import { PlayCircle, Plus, Settings2, Trash2 } from "lucide-react";
import Carousel from "./Carousel";
import ConfirmDialog from "./ConfirmDialog";
import { formatYoutubeUrl, isValidYoutubeUrl } from "../lib/ranking";

const MAX_VIDEOS = 20;
function toEmbedUrl(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}

export default function VideoSection({ videos, onAdd, onDelete, isAdmin }) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(null);
  const atLimit = videos.length >= MAX_VIDEOS;

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!isValidYoutubeUrl(trimmed)) {
      return setError(
        "Please enter a valid YouTube URL (e.g. https://www.youtube.com/watch?v=... or https://youtu.be/...).",
      );
    }
    try {
      await onAdd(formatYoutubeUrl(trimmed));
      setUrl("");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          Match Videos{" "}
          <span className="text-slate-400 font-normal normal-case">
            ({videos.length}/{MAX_VIDEOS})
          </span>
        </h2>
        {isAdmin && (
          <button
            onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border dark:border-slate-600 text-xs font-bold uppercase tracking-wide hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
          >
            <Settings2 size={13} /> Manage
          </button>
        )}
      </div>
      {isAdmin && editing ? (
        <div className="space-y-3">
          <form onSubmit={handleAdd} className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="YouTube link"
              disabled={atLimit}
              className="flex-1 border dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              disabled={atLimit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              <Plus size={15} /> Add
            </button>
          </form>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {videos.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
              >
                <span className="truncate flex-1 text-slate-600 dark:text-slate-300">
                  {v}
                </span>
                <button
                  onClick={() => setConfirm(i)}
                  className="text-slate-300 hover:text-red-500 shrink-0 ml-2"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {videos.length === 0 && (
              <p className="text-slate-400 text-sm text-center py-2">
                No videos yet.
              </p>
            )}
          </div>
        </div>
      ) : videos.length === 0 ? (
        <div className="aspect-video rounded-xl bg-slate-50 dark:bg-slate-700 border border-dashed dark:border-slate-600 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <PlayCircle size={32} className="mx-auto mb-1 text-slate-300" />
            <p className="text-sm">
              {isAdmin ? "Add a YouTube link via Manage" : "No videos yet."}
            </p>
          </div>
        </div>
      ) : (
        <Carousel
          items={videos.map((v, i) => (
            <div key={i} className="aspect-video bg-slate-50 dark:bg-slate-700">
              <iframe
                src={toEmbedUrl(v)}
                className="w-full h-full"
                allowFullScreen
                title={`video-${i}`}
              />
            </div>
          ))}
        />
      )}
      <ConfirmDialog
        open={confirm !== null}
        title="Remove this video?"
        message="The video link will be removed."
        confirmLabel="Remove"
        onConfirm={() => {
          onDelete(confirm);
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
