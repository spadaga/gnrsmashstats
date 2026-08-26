// Helpers for the PIN-based auth and roles system.
// Admin data lives in state.players as { name, pin?, photo?, role? } objects.

const norm = (s) => String(s || "").trim().toLowerCase();

// The one player with write access to everything (see CLAUDE.md's Admin auth section).
export const SUPER_ADMIN_NAME = "Suresh Padaga";

export function isSuperAdmin(adminName) {
  if (!adminName) return false;
  return norm(adminName) === norm(SUPER_ADMIN_NAME);
}

// Players who have rights to modify scores & add/update video URLs
export const SCORE_ADMIN_NAMES = ["Srinivas Padaga"];

// Players who have rights to add/update match video URLs (for current & past matches)
export const VIDEO_ADMIN_NAMES = ["Sanjeev Kumar", "Abdhulla", "Abdullah"];

// Players who have rights to log matches only
export const MATCH_LOGGER_NAMES = ["Narendra", "Narender", "HR", "Pradeep Raghav"];

export const ROLES = [
  { key: "admin", label: "Admin", description: "Full administrative access" },
  {
    key: "score_editor",
    label: "Score & Video Editor",
    description: "Can log matches, modify scores, and add/update YouTube video URLs",
  },
  {
    key: "video_editor",
    label: "Video Editor",
    description: "Can log matches and add/update YouTube video URLs",
  },
  {
    key: "match_logger",
    label: "Match Logger",
    description: "Can log matches only",
  },
  { key: "contributor", label: "Contributor", description: "Standard player" },
];

export function getPlayerRole(player) {
  if (!player) return "contributor";
  const name = typeof player === "string" ? player : player.name;
  const n = norm(name);
  if (n === norm(SUPER_ADMIN_NAME)) return "admin";

  const explicitRole = typeof player === "object" ? player.role : undefined;
  if (explicitRole) {
    if (explicitRole === "admin") return "admin";
    if (explicitRole === "score_editor") return "score_editor";
    if (explicitRole === "video_editor") return "video_editor";
    if (explicitRole === "match_logger") return "match_logger";
    if (explicitRole === "contributor") return "contributor";
  }

  // Default role mappings based on configured names
  if (SCORE_ADMIN_NAMES.some((x) => norm(x) === n)) return "score_editor";
  if (VIDEO_ADMIN_NAMES.some((x) => norm(x) === n)) return "video_editor";
  if (MATCH_LOGGER_NAMES.some((x) => norm(x) === n)) return "match_logger";
  return "contributor";
}

export function canLogMatch(adminName, players = []) {
  if (!adminName) return false;
  if (norm(adminName) === norm(SUPER_ADMIN_NAME)) return true;
  const player = players.find(
    (p) => norm(typeof p === "string" ? p : p.name) === norm(adminName),
  );
  const role = getPlayerRole(player || adminName);
  return (
    role === "admin" ||
    role === "score_editor" ||
    role === "video_editor" ||
    role === "match_logger" ||
    !!(player && player.pin)
  );
}

export function canEditScore(adminName, players = []) {
  if (!adminName) return false;
  if (norm(adminName) === norm(SUPER_ADMIN_NAME)) return true;
  const player = players.find(
    (p) => norm(typeof p === "string" ? p : p.name) === norm(adminName),
  );
  const role = getPlayerRole(player || adminName);
  return role === "admin" || role === "score_editor";
}

export function canManageVideoUrls(adminName, players = []) {
  if (!adminName) return false;
  if (norm(adminName) === norm(SUPER_ADMIN_NAME)) return true;
  const player = players.find(
    (p) => norm(typeof p === "string" ? p : p.name) === norm(adminName),
  );
  const role = getPlayerRole(player || adminName);
  return role === "admin" || role === "score_editor" || role === "video_editor";
}

export function isMatchAdmin(adminName, players = []) {
  if (!adminName) return false;
  if (norm(adminName) === norm(SUPER_ADMIN_NAME)) return true;
  return canEditScore(adminName, players) || canManageVideoUrls(adminName, players);
}

export function getAdmins(players) {
  return players.filter((p) => p.pin);
}

export function verifyPin(players, name, pin) {
  const player = players.find((p) => p.name === name);
  return player?.pin === pin;
}

export function findAdminByPin(players, pin) {
  return players.find((p) => p.pin && p.pin === pin);
}

export function playerNames(players) {
  return players.map((p) => (typeof p === "string" ? p : p.name));
}

export function photoMap(players) {
  return Object.fromEntries(
    players
      .filter((p) => typeof p === "object" && p.photo)
      .map((p) => [p.name, p.photo]),
  );
}
