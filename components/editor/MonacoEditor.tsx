"use client";

import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

/**
 * Thin React wrapper around monaco-editor with everything served locally —
 * no CDN loader. Workers are bundled by webpack via `new Worker(new URL(...))`.
 */

declare global {
  interface Window {
    __njsaMonacoReady?: boolean;
  }
}

function setupMonaco() {
  if (typeof window === "undefined" || window.__njsaMonacoReady) return;
  window.__njsaMonacoReady = true;

  self.MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === "typescript" || label === "javascript") {
        return new Worker(
          new URL("monaco-editor/esm/vs/language/typescript/ts.worker.js", import.meta.url)
        );
      }
      if (label === "json") {
        return new Worker(
          new URL("monaco-editor/esm/vs/language/json/json.worker.js", import.meta.url)
        );
      }
      if (label === "css") {
        return new Worker(
          new URL("monaco-editor/esm/vs/language/css/css.worker.js", import.meta.url)
        );
      }
      if (label === "html") {
        return new Worker(
          new URL("monaco-editor/esm/vs/language/html/html.worker.js", import.meta.url)
        );
      }
      return new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url));
    },
  };

  const ts = monaco.languages.typescript;
  ts.typescriptDefaults.setCompilerOptions({
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
    allowNonTsExtensions: true,
    allowJs: true,
    noEmit: true,
  });
  ts.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: true, // lightweight sandbox typings — keep syntax checks only
    noSyntaxValidation: false,
  });
  ts.typescriptDefaults.addExtraLib(
    `declare module "react" { const React: any; export = React; }
declare module "react-dom/client" { const ReactDOM: any; export = ReactDOM; }
declare module "next/link" { const Link: any; export default Link; }
declare module "next/image" { const Image: any; export default Image; }
declare module "next/navigation" {
  export function useRouter(): { push(href: string): void; replace(href: string): void; back(): void };
  export function usePathname(): string;
  export function useParams(): Record<string, string>;
}
declare namespace JSX { interface IntrinsicElements { [elem: string]: any } }`,
    "file:///njsa-globals.d.ts"
  );

  monaco.editor.defineTheme("njsa-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5A6178", fontStyle: "italic" },
      { token: "keyword", foreground: "FFAD47" },
      { token: "string", foreground: "4ADE80" },
      { token: "type", foreground: "7DD3FC" },
    ],
    colors: {
      "editor.background": "#0B0E16",
      "editor.lineHighlightBackground": "#141928",
      "editorLineNumber.foreground": "#3a4260",
      "editorCursor.foreground": "#FFAD47",
    },
  });
}

function languageFor(path: string) {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".jsx") || path.endsWith(".js")) return "javascript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".md")) return "markdown";
  return "plaintext";
}

function modelFor(path: string, value: string) {
  const uri = monaco.Uri.parse(`file://${path}`);
  const existing = monaco.editor.getModel(uri);
  if (existing) {
    if (existing.getValue() !== value) existing.setValue(value);
    return existing;
  }
  return monaco.editor.createModel(value, languageFor(path), uri);
}

export function MonacoEditor({
  path,
  value,
  readOnly,
  onChange,
  formatSignal,
}: {
  path: string;
  value: string;
  readOnly?: boolean;
  onChange: (value: string) => void;
  /** Increment to trigger "Format document". */
  formatSignal?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setupMonaco();
    if (!containerRef.current) return;
    const editor = monaco.editor.create(containerRef.current, {
      model: modelFor(path, value),
      theme: "njsa-dark",
      fontSize: 13,
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      padding: { top: 12 },
      tabSize: 2,
      readOnly,
      fixedOverflowWidgets: true,
    });
    editorRef.current = editor;
    const sub = editor.onDidChangeModelContent(() => {
      onChangeRef.current(editor.getValue());
    });
    return () => {
      sub.dispose();
      editor.dispose();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Switch files by swapping models (preserves undo stacks per file).
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = modelFor(path, value);
    if (editor.getModel() !== model) editor.setModel(model);
    editor.updateOptions({ readOnly });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, readOnly]);

  // External value resets (e.g. "Reset lesson").
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model && model.uri.path === path && model.getValue() !== value) {
      model.setValue(value);
    }
  }, [value, path]);

  useEffect(() => {
    if (!formatSignal) return;
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  }, [formatSignal]);

  return <div ref={containerRef} className="h-full w-full" />;
}
