"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Terminal } from "lucide-react";
import { compileFiles } from "@/lib/sandbox/compile";
import { buildSrcDoc } from "@/lib/sandbox/runtime";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ConsoleLine {
  level: "log" | "info" | "warn" | "error";
  text: string;
  id: number;
}

/**
 * Compiles the current files and runs them in a same-origin `srcdoc` iframe.
 * Console/runtime errors are captured via postMessage; because the iframe is
 * same-origin, `getPreviewDocument()` also lets the validation engine query
 * its live DOM directly.
 */
export function PreviewPanel({
  files,
  entry,
  onDocumentReady,
}: {
  files: Record<string, string>;
  entry: string;
  onDocumentReady: (doc: Document | null) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [lines, setLines] = useState<ConsoleLine[]>([]);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const lineId = useRef(0);
  const [runToken, setRunToken] = useState(0);

  const run = useCallback(async () => {
    setBuilding(true);
    setBuildError(null);
    setLines([]);
    const result = await compileFiles(files);
    if (!result.ok) {
      setBuildError(result.error);
      setBuilding(false);
      onDocumentReady(null);
      return;
    }
    const srcDoc = buildSrcDoc(result.modules, entry);
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.srcdoc = srcDoc;
    }
    setBuilding(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, entry]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runToken]);

  // Debounced auto-run on file changes.
  useEffect(() => {
    const t = setTimeout(() => run(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, entry]);

  useEffect(() => {
    function handler(e: MessageEvent) {
      const data = e.data;
      if (!data || data.__njsa !== true) return;
      if (data.kind === "console") {
        setLines((prev) => [...prev, { ...data.payload, id: lineId.current++ }]);
      } else if (data.kind === "error") {
        setLines((prev) => [...prev, { level: "error", text: data.payload.text, id: lineId.current++ }]);
        setShowConsole(true);
      } else if (data.kind === "ready") {
        onDocumentReady(iframeRef.current?.contentDocument ?? null);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errorCount = lines.filter((l) => l.level === "error").length;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-ink-700 bg-ink-900 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] text-mist-400">
          <span className="h-2 w-2 rounded-full bg-signal-green" />
          localhost:3000 (sandbox)
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConsole((s) => !s)}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-colors",
              showConsole ? "bg-ink-700 text-ember-300" : "text-mist-400 hover:text-mist-200"
            )}
          >
            <Terminal size={12} /> Console
            {errorCount > 0 && (
              <span className="ml-1 rounded-full bg-signal-red/20 px-1.5 text-signal-red">
                {errorCount}
              </span>
            )}
          </button>
          <Button size="sm" variant="outline" onClick={() => setRunToken((t) => t + 1)}>
            {building ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Run
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 bg-white">
        {buildError ? (
          <div className="flex h-full items-start gap-3 overflow-y-auto bg-ink-950 p-5">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-signal-red" />
            <pre className="whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-signal-red">
              {buildError}
            </pre>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Live preview"
            sandbox="allow-scripts allow-same-origin"
            className="h-full w-full border-0"
          />
        )}
        {building && !buildError && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/40 backdrop-blur-[1px]">
            <Loader2 size={20} className="animate-spin text-ember-400" />
          </div>
        )}
      </div>

      {showConsole && (
        <div className="h-40 shrink-0 overflow-y-auto border-t border-ink-700 bg-ink-950 p-2 font-mono text-[11.5px]">
          {lines.length === 0 ? (
            <p className="p-2 text-mist-500">No console output yet.</p>
          ) : (
            lines.map((l) => (
              <div
                key={l.id}
                className={cn(
                  "px-2 py-0.5",
                  l.level === "error"
                    ? "text-signal-red"
                    : l.level === "warn"
                      ? "text-ember-400"
                      : "text-mist-300"
                )}
              >
                <span className="mr-2 text-mist-600">[{l.level}]</span>
                {l.text}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
