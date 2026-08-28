import { LazyStore } from "@tauri-apps/plugin-store";

export type RecentDirectory = {
  path: string;
  accessedAt: number;
};

const store = new LazyStore("terax-recent-directories.json", {
  defaults: {},
  autoSave: 500,
});
const KEY = "directories";
const MAX_ENTRIES = 10;

function normalizePath(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  return normalized || path;
}

export async function loadRecentDirectories(): Promise<RecentDirectory[]> {
  const value = await store.get<RecentDirectory[]>(KEY);
  return Array.isArray(value)
    ? value
        .filter((entry) => entry && typeof entry.path === "string")
        .map((entry) => ({ path: normalizePath(entry.path), accessedAt: entry.accessedAt }))
        .sort((a, b) => b.accessedAt - a.accessedAt)
        .slice(0, MAX_ENTRIES)
    : [];
}

export async function recordRecentDirectory(path: string): Promise<RecentDirectory[]> {
  const normalized = normalizePath(path);
  const entries = (await loadRecentDirectories()).filter((entry) => entry.path.toLowerCase() !== normalized.toLowerCase());
  const next = [{ path: normalized, accessedAt: Date.now() }, ...entries].slice(0, MAX_ENTRIES);
  await store.set(KEY, next);
  return next;
}

export async function removeRecentDirectory(path: string): Promise<RecentDirectory[]> {
  const next = (await loadRecentDirectories()).filter((entry) => entry.path.toLowerCase() !== path.toLowerCase());
  await store.set(KEY, next);
  return next;
}