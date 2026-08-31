import type { Tab } from "@/modules/tabs";
import type { SearchAddon } from "@xterm/addon-search";
import { useEffect, useMemo, useRef, useState } from "react";
import { selectLiveTerminals } from "./lib/liveTerminals";
import { leafIds } from "./lib/panes";
import { PaneTreeView } from "./PaneTreeView";
import type { TerminalPaneHandle } from "./TerminalPane";
import { terminalDebugStats } from "./lib/useTerminalSession";

type Props = {
  tabs: Tab[];
  activeId: number;
  /** Register/unregister handle by leaf id (not tab id). */
  registerHandle: (leafId: number, handle: TerminalPaneHandle | null) => void;
  onSearchReady: (leafId: number, addon: SearchAddon) => void;
  onCwd: (leafId: number, cwd: string) => void;
  onExit: (leafId: number, code: number) => void;
  onFocusLeaf: (tabId: number, leafId: number) => void;
  onClosePane: (leafId: number) => void;
};

type Bundle = {
  setRef: (h: TerminalPaneHandle | null) => void;
  onSearchReady: (leafId: number, addon: SearchAddon) => void;
  onCwd: (leafId: number, cwd: string) => void;
  onExit: (leafId: number, code: number) => void;
};

export function TerminalStack({
  tabs,
  activeId,
  registerHandle,
  onSearchReady,
  onCwd,
  onExit,
  onFocusLeaf,
  onClosePane,
}: Props) {
  const terminals = useMemo(() => selectLiveTerminals(tabs), [tabs]);

  const registerRef = useRef(registerHandle);
  const searchReadyRef = useRef(onSearchReady);
  const cwdRef = useRef(onCwd);
  const exitRef = useRef(onExit);
  useEffect(() => {
    registerRef.current = registerHandle;
  }, [registerHandle]);
  useEffect(() => {
    searchReadyRef.current = onSearchReady;
  }, [onSearchReady]);
  useEffect(() => {
    cwdRef.current = onCwd;
  }, [onCwd]);
  useEffect(() => {
    exitRef.current = onExit;
  }, [onExit]);

  const bundles = useRef(new Map<number, Bundle>());
  const getBundle = (leafId: number): Bundle => {
    let b = bundles.current.get(leafId);
    if (!b) {
      b = {
        setRef: (h) => registerRef.current(leafId, h),
        onSearchReady: (id, addon) => searchReadyRef.current(id, addon),
        onCwd: (id, cwd) => cwdRef.current(id, cwd),
        onExit: (id, code) => exitRef.current(id, code),
      };
      bundles.current.set(leafId, b);
    }
    return b;
  };

  useEffect(() => {
    const live = new Set<number>();
    for (const t of terminals)
      for (const id of leafIds(t.paneTree)) live.add(id);
    for (const id of bundles.current.keys()) {
      if (!live.has(id)) bundles.current.delete(id);
    }
  }, [terminals]);

  return (
    <div className="relative h-full w-full">
      {import.meta.env.DEV && <TerminalDiagnostics />}
      {terminals.map((t) => {
        const tabVisible = t.id === activeId;
        return (
          <div
            key={t.id}
            data-terminal-tab={t.id}
            className="absolute inset-0"
            style={{
              visibility: tabVisible ? "visible" : "hidden",
              pointerEvents: tabVisible ? "auto" : "none",
            }}
            aria-hidden={!tabVisible}
          >
            <PaneTreeView
              node={t.paneTree}
              tabVisible={tabVisible}
              activeLeafId={t.activeLeafId}
              blocks={t.blocks ?? false}
              onFocusLeaf={(leafId) => onFocusLeaf(t.id, leafId)}
              onClosePane={onClosePane}
              canClosePane={leafIds(t.paneTree).length > 1}
              getBundle={getBundle}
            />
          </div>
        );
      })}
    </div>
  );
}

function TerminalDiagnostics() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.altKey &&
        event.code === "KeyD"
      ) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;
  const refresh = () => setReport(JSON.stringify(terminalDebugStats(), null, 2));
  const copy = async () => {
    refresh();
    await navigator.clipboard.writeText(JSON.stringify(terminalDebugStats(), null, 2));
  };
  return (
    <div className="absolute bottom-3 right-3 z-50 w-[min(620px,calc(100%-1.5rem))] rounded-md border border-border bg-background/95 p-3 text-xs shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <strong>Terminal diagnostics (dev only)</strong>
        <div className="flex gap-2">
          <button type="button" className="rounded border px-2 py-1" onClick={refresh}>Refresh</button>
          <button type="button" className="rounded border px-2 py-1" onClick={() => void copy()}>Copy</button>
          <button type="button" className="rounded border px-2 py-1" onClick={() => setOpen(false)}>Close</button>
        </div>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2">{report || "Click Refresh"}</pre>
    </div>
  );
}
