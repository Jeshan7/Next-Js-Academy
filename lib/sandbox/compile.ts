/**
 * Compiles the learner's virtual files (TSX/TS) to CommonJS with
 * @babel/standalone, entirely in the browser. Deterministic, offline,
 * no server round-trip.
 */

export interface CompileSuccess {
  ok: true;
  modules: Record<string, string>;
}
export interface CompileFailure {
  ok: false;
  error: string;
}
export type CompileOutput = CompileSuccess | CompileFailure;

let babelPromise: Promise<typeof import("@babel/standalone")> | null = null;

function loadBabel() {
  if (!babelPromise) babelPromise = import("@babel/standalone");
  return babelPromise;
}

export async function compileFiles(
  files: Record<string, string>
): Promise<CompileOutput> {
  const Babel = await loadBabel();
  const modules: Record<string, string> = {};

  for (const [path, code] of Object.entries(files)) {
    // Only JS/TS files are modules; docs like README.md are just for reading.
    if (!/\.(tsx?|jsx?|mjs)$/.test(path)) continue;
    try {
      const result = Babel.transform(code, {
        filename: path,
        presets: [
          ["react", { runtime: "classic" }],
          ["typescript", { isTSX: /\.(tsx|jsx)$/.test(path), allExtensions: true }],
        ],
        plugins: [["transform-modules-commonjs", { strictMode: false }]],
        sourceType: "module",
      });
      modules[path] = result.code ?? "";
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Build error in ${path}:\n${message}` };
    }
  }
  return { ok: true, modules };
}
