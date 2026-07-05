/**
 * Copies the React UMD builds from node_modules into public/vendor.
 *
 * The live-preview sandbox runs inside an <iframe srcdoc> and loads React
 * from these local files, so the whole platform works offline after
 * `npm install` — no CDN required.
 */
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "vendor");
mkdirSync(out, { recursive: true });

const files = [
  ["react/umd/react.development.js", "react.development.js"],
  ["react-dom/umd/react-dom.development.js", "react-dom.development.js"],
];

for (const [src, dest] of files) {
  const from = join(root, "node_modules", src);
  if (!existsSync(from)) {
    console.warn(`[copy-vendor] missing ${src} — run npm install first`);
    continue;
  }
  copyFileSync(from, join(out, dest));
  console.log(`[copy-vendor] ${dest} ready`);
}
