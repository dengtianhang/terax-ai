import { MarkdownCode } from "@/components/ai-elements/markdown-code";
import { cn } from "@/lib/utils";
import { currentWorkspaceEnv } from "@/modules/workspace";
import { invoke } from "@tauri-apps/api/core";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
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
async function prepareMarkdownContent(content: string, markdownPath: string) {
  const objectUrls: string[] = [];
  let prepared = content.replace(
    /((?:href)=["'])(?!https?:|data:|blob:|asset:|[/.#])([^"']+)(["'])/gi,
    "$1./$2$3",
  );
  const matches = [
    ...prepared.matchAll(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi),
  ];
  for (const match of matches) {
    const source = match[2];
    if (/^(?:https?:|data:|blob:|asset:)/i.test(source)) continue;
    const target = resolveMarkdownImagePath(source, markdownPath);
    const mime = target
      ? imageMimeTypes[target.split(".").pop()?.toLowerCase() ?? ""]
      : undefined;
    if (!target || !mime) continue;
    try {
      const bytes = await invoke<number[]>("fs_read_binary", {
        path: target,
        workspace: currentWorkspaceEnv(),
      });
      const objectUrl = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: mime }),
      );
      objectUrls.push(objectUrl);
      prepared = prepared.replace(
        match[0],
        `${match[1]}${objectUrl}${match[3]}`,
      );
    } catch {}
  }
  return { content: prepared, objectUrls };
}
type MarkdownImageProps = ComponentProps<"img"> & { markdownPath: string };
function MarkdownImage({
  src,
  alt,
  markdownPath,
  ...props
}: MarkdownImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!src || /^(?:https?:|data:|blob:|asset:)/i.test(src)) {
      setImageUrl(src ?? null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    const target = resolveMarkdownImagePath(src, markdownPath);
    const mime = target
      ? imageMimeTypes[target.split(".").pop()?.toLowerCase() ?? ""]
      : undefined;
    if (!target || !mime) {
      setImageUrl(null);
      return;
    }
    void invoke<number[]>("fs_read_binary", {
      path: target,
      workspace: currentWorkspaceEnv(),
    })
      .then((bytes) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(
            new Blob([new Uint8Array(bytes)], { type: mime }),
          );
          setImageUrl(objectUrl);
        }
      })
      .catch(() => setImageUrl(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src, markdownPath]);
  return (
    <img
      {...props}
      src={imageUrl ?? undefined}
      alt={alt ?? ""}
      loading="lazy"
    />
  );
}

export function MarkdownPreviewPane({ path, visible, onSetView }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [renderedContent, setRenderedContent] = useState("");
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
      return;
    }
    let cancelled = false;
    let objectUrls: string[] = [];
    void prepareMarkdownContent(status.content, path).then((result) => {
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
  }, [path, status]);
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col overflow-hidden bg-background",
        !visible && "pointer-events-none",
      )}
    >
      <MarkdownViewToggle mode="rendered" onChange={onSetView} />
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
