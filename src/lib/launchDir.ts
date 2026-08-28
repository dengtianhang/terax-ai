import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

let cached: string | undefined;

export async function initLaunchDir(): Promise<void> {
  const windowDir = await invoke<string | null>("get_workspace_launch_dir").catch(() => null);
  const queryDir = new URLSearchParams(window.location.search).get("workspace");
  const dir =
    windowDir ??
    queryDir ??
    (await invoke<string | null>("get_launch_dir").catch(() => null)) ??
    (await invoke<string>("workspace_current_dir").catch(() => null));
  cached = dir ? dir.replace(/\\/g, "/") : undefined;
}

export function getLaunchDir(): string | undefined {
  return cached;
}

/**
 * Drains the files passed via the OS "Open With" action (CLI args on
 * Linux/Windows, macOS open-files event). Drained once so HMR / re-mounts
 * can't replay them. Returns [] when the app wasn't launched with a file.
 */
export async function consumeLaunchFiles(): Promise<string[]> {
  const files = await invoke<string[]>("get_launch_files").catch(() => []);
  return files.map((f) => f.replace(/\\/g, "/"));
}

export function isNewWindowLaunch(): boolean {
  return (
    getCurrentWindow().label.startsWith("workspace-") ||
    new URLSearchParams(window.location.search).get("workspace") !== null
  );
}
