import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChatStore } from "@/modules/ai";
import { AgentStatusPill } from "@/modules/ai/components/AgentStatusPill";
import {
  AiOpenButton,
  AiStatusBarControls,
} from "@/modules/ai/components/AiStatusBarControls";
import { LspStatusPill } from "@/modules/lsp";
import type { WorkspaceEnv } from "@/modules/workspace";
import { IncognitoIcon } from "@hugeicons/core-free-icons";
import { Folder01Icon } from "@hugeicons/core-free-icons";
import { useI18n } from "@/lib/i18n";
import { HugeiconsIcon } from "@hugeicons/react";
import { CwdBreadcrumb } from "./CwdBreadcrumb";
import { DiagnosticsBadge } from "./DiagnosticsBadge";
import { WorkspaceEnvSelector } from "./WorkspaceEnvSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RecentDirectory } from "@/modules/workspace";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

function directoryName(path: string): string {
  const normalized = path.replace(/[\\/]+$/, "");
  return normalized.split(/[\\/]/).pop() || normalized;
}

type Props = {
  cwd: string | null;
  filePath?: string | null;
  home: string | null;
  onCd: (path: string) => void;
  onWorkspaceChange: (env: WorkspaceEnv) => void;
  onChooseDirectory: () => Promise<string | null>;
  recentDirectories: RecentDirectory[];
  onOpenDirectoryInCurrentWindow: (path: string) => void;
  onOpenDirectoryInNewWindow: (path: string) => void;
  onRemoveRecentDirectory: (path: string) => void;
  onOpenMini: () => void;
  /** Opens the panel, or Settings > Models when no API key is loaded. */
  onOpenAi: () => void;
  /** Only rendered when the AI panel is open and a key is loaded. */
  hasComposer: boolean;
  privateActive: boolean;
};

export function StatusBar({
  cwd,
  filePath,
  home,
  onCd,
  onWorkspaceChange,
  onChooseDirectory,
  recentDirectories,
  onOpenDirectoryInCurrentWindow,
  onOpenDirectoryInNewWindow,
  onRemoveRecentDirectory,
  onOpenMini,
  onOpenAi,
  hasComposer,
  privateActive,
}: Props) {
  const panelOpen = useChatStore((s) => s.panelOpen);
  const { t, tt } = useI18n();
  const [directoryToOpen, setDirectoryToOpen] = useState<string | null>(null);

  const handlePickDirectory = async () => {
    setDirectoryToOpen(await onChooseDirectory());
  };

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between gap-3 pl-3 pr-4 text-[11px]">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <WorkspaceEnvSelector onSelect={onWorkspaceChange} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              title={t("workspace.selectDirectory")}
              className="flex h-6 shrink-0 items-center gap-1 rounded-sm px-1.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <HugeiconsIcon icon={Folder01Icon} size={13} strokeWidth={1.75} />
              <span className="hidden sm:inline">{t("workspace.selectDirectory")}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-96">
            <DropdownMenuItem onSelect={() => void handlePickDirectory()}>
              {t("workspace.selectDirectory")}
            </DropdownMenuItem>
            {recentDirectories.length > 0 ? <DropdownMenuSeparator /> : null}
            {recentDirectories.map((entry) => (
              <DropdownMenuItem
                key={entry.path}
                className="group/recent max-w-96 items-start"
                onSelect={() => setDirectoryToOpen(entry.path)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium" title={entry.path}>
                    {directoryName(entry.path)}
                  </span>
                  <span className="block truncate text-xs font-normal text-muted-foreground" title={entry.path}>
                    {entry.path}
                  </span>
                </span>
                <button
                  type="button"
                  className="ml-auto hidden shrink-0 rounded px-1 text-muted-foreground hover:bg-accent hover:text-foreground group-hover/recent:block"
                  title="移除"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveRecentDirectory(entry.path);
                  }}
                >
                  ×
                </button>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={directoryToOpen !== null} onOpenChange={(open) => !open && setDirectoryToOpen(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>打开项目目录</DialogTitle>
              <DialogDescription className="break-all">{directoryToOpen}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDirectoryToOpen(null)}>取消</Button>
              <Button onClick={() => { if (directoryToOpen) onOpenDirectoryInCurrentWindow(directoryToOpen); setDirectoryToOpen(null); }}>当前窗口打开</Button>
              <Button onClick={() => { if (directoryToOpen) onOpenDirectoryInNewWindow(directoryToOpen); setDirectoryToOpen(null); }}>新窗口打开</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <CwdBreadcrumb cwd={cwd} filePath={filePath} home={home} onCd={onCd} />
        <LspStatusPill filePath={filePath ?? null} />
        <DiagnosticsBadge filePath={filePath ?? null} />
        {privateActive ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex shrink-0 cursor-default items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:text-amber-400">
                <HugeiconsIcon icon={IncognitoIcon} size={11} strokeWidth={2} />
                <span>{tt("Private: hidden from AI")}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="max-w-64 text-[11px] leading-relaxed"
            >
              {tt("AI can't see this terminal's output. Use it for secrets, SSH, or anything you don't want sent to the model.")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <AgentStatusPill onClick={onOpenMini} />
        {panelOpen && hasComposer ? (
          <AiStatusBarControls />
        ) : (
          <AiOpenButton onOpen={onOpenAi} />
        )}
      </div>
    </footer>
  );
}
