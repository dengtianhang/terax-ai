import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { SearchAddon } from "@xterm/addon-search";
import { Fragment } from "react";
import { useI18n } from "@/lib/i18n";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTerminalDropStore } from "./lib/dropStore";
import { firstLeafSlotId, type PaneNode } from "./lib/panes";
import { TerminalPane, type TerminalPaneHandle } from "./TerminalPane";

type LeafBundle = {
  setRef: (h: TerminalPaneHandle | null) => void;
  onSearchReady: (leafId: number, addon: SearchAddon) => void;
  onCwd: (leafId: number, cwd: string) => void;
  onExit: (leafId: number, code: number) => void;
};

type Props = {
  node: PaneNode;
  tabVisible: boolean;
  activeLeafId: number;
  blocks: boolean;
  onFocusLeaf: (leafId: number) => void;
  onClosePane: (leafId: number) => void;
  canClosePane: boolean;
  getBundle: (leafId: number) => LeafBundle;
};

export function PaneTreeView(props: Props) {
  const { node } = props;
  const { tt } = useI18n();
  if (node.kind === "leaf") {
    const { tabVisible, activeLeafId, blocks, onFocusLeaf, onClosePane, canClosePane, getBundle } = props;
    const focused = node.id === activeLeafId;
    const b = getBundle(node.id);
    return (
      <div
        onMouseDownCapture={() => {
          if (!focused) onFocusLeaf(node.id);
        }}
        // Catches focus from Tab, programmatic focus, or any path that
        // skips mousedown — keeps activeLeafId in sync with DOM focus.
        onFocus={() => {
          if (!focused) onFocusLeaf(node.id);
        }}
        data-pane-leaf={node.id}
        className="group relative h-full w-full"
      >
        <TerminalPane
          leafId={node.id}
          visible={tabVisible}
          focused={focused}
          initialCwd={node.cwd}
          blocks={blocks}
          ref={b.setRef}
          onSearchReady={b.onSearchReady}
          onCwd={b.onCwd}
          onExit={b.onExit}
        />
        <DropOverlay leafId={node.id} />
        {canClosePane && (
        <button
          type="button"
          aria-label={tt("Close pane")}
          title={tt("Close pane")}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClosePane(node.id);
          }}
          className="absolute right-2 top-2 z-30 flex size-5 items-center justify-center rounded-full border border-foreground/15 bg-background/65 text-muted-foreground opacity-0 shadow-sm backdrop-blur-md transition-all duration-150 hover:border-destructive/35 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
        >
          <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={1.9} />
        </button>
        )}
        {focused && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] border-[0.5px] border-foreground/20 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--foreground)_10%,transparent),0_0_5px_color-mix(in_srgb,var(--foreground)_5%,transparent)]"
          />
        )}
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      orientation={node.dir === "row" ? "horizontal" : "vertical"}
    >
      {node.children.map((child, i) => {
        const slotId = firstLeafSlotId(child);
        return (
          <Fragment key={slotId}>
            {i > 0 && (
              <ResizableHandle className="bg-border/50 transition-colors duration-[var(--dur-fast)] after:w-3 hover:bg-border" />
            )}
            <ResizablePanel id={`pane-slot-${slotId}`} minSize="10%">
              <PaneTreeView {...props} node={child} />
            </ResizablePanel>
          </Fragment>
        );
      })}
    </ResizablePanelGroup>
  );
}

function DropOverlay({ leafId }: { leafId: number }) {
  const active = useTerminalDropStore((s) => s.targetLeafId === leafId);
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-lg border border-primary/45 bg-background/70 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm">
      Drop file path here
    </div>
  );
}
