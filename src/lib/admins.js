// Helpers for the PIN-based auth and roles system.
// Admin data lives in state.players as { name, pin?, photo?, role? } objects.

// The one player with write access to everything (see CLAUDE.md's Admin auth section).
export const SUPER_ADMIN_NAME = "Suresh Padaga";

// Players who can add and update match video URLs (for current & past matches) by default
export const VIDEO_ADMIN_NAMES = ["Sanjeev Kumar", "Abdhulla", "Abdullah"];

// Players who can edit/delete matches, in addition to the super admin.
export const MATCH_ADMIN_NAMES = ["Abdhulla", "Sanjeev Kumar"];

export const ROLES = [
  { key: "admin", label: "Admin", description: "Full administrative access" },
  { key: "video_editor", label: "Video Editor", description: "Can add & update match video URLs for current and past matches" },
  { key: "contributor", label: "Contributor", description: "Standard player" },
];

export function getPlayerRole(player) {
  if (!player) return "contributor";
  const name = typeof player === "string" ? player : player.name;
  if (name === SUPER_ADMIN_NAME) return "admin";
  const explicitRole = typeof player === "object" ? player.role : undefined;
  if (explicitRole === "admin") return "admin";
  if (explicitRole === "video_editor") return "video_editor";
  if (VIDEO_ADMIN_NAMES.includes(name)) return "video_editor";
  return "contributor";
}

export function canManageVideoUrls(adminName, players = []) {
  if (!adminName) return false;
  if (adminName === SUPER_ADMIN_NAME) return true;
  if (VIDEO_ADMIN_NAMES.includes(adminName)) return true;
  const player = players.find((p) => (typeof p === "string" ? p : p.name) === adminName);
  if (!player) return false;
  const role = typeof player === "object" ? player.role : undefined;
  return role === "admin" || role === "video_editor";
}

export function isMatchAdmin(adminName, players = []) {
  if (!adminName) return false;
  if (adminName === SUPER_ADMIN_NAME) return true;
  if (MATCH_ADMIN_NAMES.includes(adminName)) return true;
  const player = players.find((p) => (typeof p === "string" ? p : p.name) === adminName);
  if (!player) return false;
  return typeof player === "object" && (player.role === "admin" || player.role === "video_editor");
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
