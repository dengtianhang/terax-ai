import { MarkdownCode } from "@/components/ai-elements/markdown-code";
import { cn } from "@/lib/utils";
import { currentWorkspaceEnv } from "@/modules/workspace";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import { defaultRehypePlugins, Streamdown, type Components } from "streamdown";
import { MarkdownLink } from "./MarkdownLink";
import { MarkdownViewToggle } from "./MarkdownViewToggle";

type ReadResult =
  | { kind: "text"; content: string; size: number }
  | { kind: "binary"; size: number }
  | { kind: "toolarge"; size: number; limit: number };
type Status =
  | { kind: "loading" }
  | { kind: "ready"; content: string }
  | { kind: "binary" }
  | { kind: "toolarge"; size: number; limit: number }
  | { kind: "error"; message: string };
type Props = {
  path: string;
  visible: boolean;
  onSetView: (mode: "rendered" | "raw") => void;
};
type ImageDiagnostic = {
  phase?: "asset" | "read" | "render";
  source: string;
  target: string | null;
  workspace: string;
  status: "loaded" | "failed";
  mime?: string;
  byteLength?: number;
  urlType?: "original" | "data" | "asset";
  currentSrc?: string;
  url?: string;
  naturalWidth?: number;
  naturalHeight?: number;
  error?: string;
};

const imageMimeTypes: Record<string, string> = {
  avif: "image/avif",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  webp: "image/webp",
};
function isSafeMarkdownUrl(url: string) {
  return (
    /^(?:https?:|data:image\/|blob:)/i.test(url) ||
    !/^[a-z][a-z\d+.-]*:/i.test(url)
  );
}
function normalizeMarkdownUrl(url: string) {
  if (
    !isSafeMarkdownUrl(url) ||
    /^(?:https?:|data:|blob:|asset:|[/.#])/i.test(url)
  )
    return url;
  return `./${url}`;
}
function localImageAssetUrl(target: string) {
  return convertFileSrc(target, "asset");
}
function imageDataUrl(bytes: number[], mime: string) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}
const markdownRehypePlugins = [
  defaultRehypePlugins.raw,
];
function resolveMarkdownImagePath(source: string, markdownPath: string) {
  const decoded = decodeURIComponent(source.split(/[?#]/, 1)[0]);
  if (/^(?:https?:|data:|blob:|asset:)/i.test(decoded)) return null;
  if (
    /^[a-z]:[\\/]/i.test(decoded) ||
    decoded.startsWith("\\\\") ||
    decoded.startsWith("/")
  )
    return decoded;
  const separator = markdownPath.includes("\\") ? "\\" : "/";
  const directory = markdownPath.slice(
    0,
    Math.max(markdownPath.lastIndexOf(separator), 0),
  );
  const parts = `${directory}${separator}${decoded}`.split(/[\\/]/);
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") resolved.pop();
    else resolved.push(part);
  }
  if (/^[a-z]:$/i.test(resolved[0] ?? ""))
    return `${resolved[0]}${separator}${resolved.slice(1).join(separator)}`;
  return directory
    ? `${separator}${resolved.join(separator)}`
    : resolved.join(separator);
}
function prepareMarkdownContent(content: string) {
  return Promise.resolve({
    content: content.replace(
      /((?:href)=["'])(?!https?:|data:|blob:|asset:|[/.#])([^"']+)(["'])/gi,
      "$1./$2$3",
    ),
    objectUrls: [] as string[],
  });
}type MarkdownImageProps = ComponentProps<"img"> & {
  markdownPath: string;
  report: (diagnostic: ImageDiagnostic) => void;
};
function MarkdownImage({
  src,
  alt,
  markdownPath,
  report,
  ...props
}: MarkdownImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const target = src ? resolveMarkdownImagePath(src, markdownPath) : null;
  const mime = target
    ? imageMimeTypes[target.split(".").pop()?.toLowerCase() ?? ""]
    : undefined;
  const assetUrl = target ? localImageAssetUrl(target) : null;

  useEffect(() => {
    if (!src || /^(?:https?:|data:|blob:|asset:)/i.test(src)) {
      setImageUrl(src ?? null);
      setFallbackUrl(null);
      return;
    }
    if (!target || !mime) {
      setImageUrl(null);
      report({
        phase: "read",
        source: String(src),
        target,
        workspace: JSON.stringify(currentWorkspaceEnv()),
        status: "failed",
        mime,
        error: !target ? "无法解析图片路径" : "不支持的图片格式",
      });
      return;
    }
    setFallbackUrl(null);
    setImageUrl(assetUrl);
    report({
      phase: "asset",
      source: String(src),
      target,
      workspace: JSON.stringify(currentWorkspaceEnv()),
      status: "loaded",
      mime,
      urlType: "asset",
      url: assetUrl ?? undefined,
    });
  }, [src, markdownPath, target, mime, assetUrl, report]);

  return (
    <img
      {...props}
      src={fallbackUrl ?? imageUrl ?? undefined}
      alt={alt ?? ""}
      loading="lazy"
      onError={(event) => {
        if (fallbackUrl || !target || !mime) return;
        report({
          source: String(src),
          target,
          workspace: JSON.stringify(currentWorkspaceEnv()),
          status: "failed",
          phase: "render",
          mime,
          currentSrc: event.currentTarget.currentSrc,
          error: "asset image load failed; trying IPC data URL",
        });
        void invoke<number[]>("fs_read_binary", {
          path: target,
          workspace: currentWorkspaceEnv(),
        })
          .then((bytes) => imageDataUrl(bytes, mime))
          .then((dataUrl) => setFallbackUrl(dataUrl))
          .catch((error) => report({
            source: String(src),
            target,
            workspace: JSON.stringify(currentWorkspaceEnv()),
            status: "failed",
            phase: "read",
            mime,
            error: String(error),
          }));
      }}
      onLoad={(event) => {
        report({
          source: String(src),
          target,
          workspace: JSON.stringify(currentWorkspaceEnv()),
          status: "loaded",
          phase: "render",
          currentSrc: event.currentTarget.currentSrc,
          naturalWidth: event.currentTarget.naturalWidth,
          naturalHeight: event.currentTarget.naturalHeight,
        });
      }}
    />
  );
}export function MarkdownPreviewPane({ path, visible, onSetView }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [renderedContent, setRenderedContent] = useState("");
  const [imageDiagnostics, setImageDiagnostics] = useState<ImageDiagnostic[]>([]);
  const [imageDiagnosticsOpen, setImageDiagnosticsOpen] = useState(false);
  const reportImage = useCallback((diagnostic: ImageDiagnostic) => {
    setImageDiagnostics((current) => {
      const index = current.findIndex(
        (item) => item.source === diagnostic.source && item.target === diagnostic.target,
      );
      if (index < 0) return [...current, diagnostic];
      const next = [...current];
      next[index] = diagnostic;
      return next;
    });
  }, []);
  useEffect(() => {
    let cancelled = false;
    setStatus({ kind: "loading" });
    invoke<ReadResult>("fs_read_file", {
      path,
      workspace: currentWorkspaceEnv(),
    })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === "text")
          setStatus({ kind: "ready", content: res.content });
        else if (res.kind === "binary") setStatus({ kind: "binary" });
        else setStatus({ kind: "toolarge", size: res.size, limit: res.limit });
      })
      .catch((e) => {
        if (!cancelled) setStatus({ kind: "error", message: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [path]);
  useEffect(() => {
    if (status.kind !== "ready") {
      setRenderedContent("");
      setImageDiagnostics([]);
      setImageDiagnosticsOpen(false);
      return;
    }
    let cancelled = false;
    let objectUrls: string[] = [];
    setImageDiagnostics([]);
    setImageDiagnosticsOpen(false);
    void prepareMarkdownContent(status.content).then((result) => {
      if (cancelled) {
        result.objectUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }
      objectUrls = result.objectUrls;
      setRenderedContent(result.content);
    });
    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [path, status, reportImage]);
  useEffect(() => {
    if (status.kind !== "ready") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        event.altKey &&
        event.code === "KeyD"
      ) {
        event.preventDefault();
        setImageDiagnosticsOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [status.kind]);
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden bg-background",
        !visible && "pointer-events-none",
      )}
    >
      <MarkdownViewToggle mode="rendered" onChange={onSetView} />
      {imageDiagnosticsOpen && imageDiagnostics.length > 0 && (
        <details className="absolute right-3 top-12 z-10 max-w-[min(620px,calc(100%-1.5rem))] rounded-md border border-border bg-background/95 p-2 text-[11px] shadow-md">
          <summary className="cursor-pointer text-foreground">
            Markdown image diagnostics ({imageDiagnostics.length})
          </summary>
          <button
            type="button"
            className="mt-2 rounded border border-border px-2 py-1 text-foreground"
            onClick={() =>
              void navigator.clipboard.writeText(
                JSON.stringify(imageDiagnostics, null, 2),
              )
            }
          >
            Copy diagnostics
          </button>
          <div className="mt-2 max-h-56 space-y-2 overflow-auto">
            {imageDiagnostics.map((item, index) => (
              <pre key={`${item.source}-${index}`} className="whitespace-pre-wrap break-all text-muted-foreground">
                {JSON.stringify(item, null, 2)}
              </pre>
            ))}
          </div>
        </details>
      )}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          {status.kind === "loading" && (
            <p className="text-[12px] text-muted-foreground">Loading…</p>
          )}
          {status.kind === "error" && (
            <p className="text-[12px] text-destructive">
              Failed to read file: {status.message}
            </p>
          )}
          {status.kind === "binary" && (
            <p className="text-[12px] text-muted-foreground">
              Binary file — cannot render as markdown.
            </p>
          )}
          {status.kind === "toolarge" && (
            <p className="text-[12px] text-muted-foreground">
              File is {status.size} bytes; limit {status.limit}.
            </p>
          )}
          {status.kind === "ready" && (
            <Streamdown
              className="select-text [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_a]:text-primary [&_a]:underline"
              components={
                {
                  a: MarkdownLink,
                  code: MarkdownCode as Components["code"],
                  img: (props) => (
                    <MarkdownImage
                      {...props}
                      markdownPath={path}
                      report={reportImage}
                    />
                  ),
                } as Components
              }
              mode="static"
              parseIncompleteMarkdown={false}
              rehypePlugins={markdownRehypePlugins}
              linkSafety={{ enabled: false }}
              urlTransform={(url) =>
                isSafeMarkdownUrl(url) ? normalizeMarkdownUrl(url) : undefined
              }
            >
              {renderedContent}
            </Streamdown>
          )}
        </div>
      </div>
    </div>
  );
}
