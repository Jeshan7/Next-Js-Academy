/**
 * Builds the HTML document that runs inside the preview <iframe srcdoc>.
 *
 * The document loads React from /public/vendor (copied locally at install
 * time), registers every compiled module in a tiny CommonJS registry, and
 * provides browser shims for the Next.js client APIs used by lessons:
 * next/link, next/navigation and next/image.
 *
 * Console output and runtime errors are forwarded to the parent window
 * via postMessage. Because srcdoc iframes are same-origin, the parent can
 * also inspect the DOM directly for deterministic validation.
 */

const RUNTIME = String.raw`
(function () {
  var registry = {};
  var cache = {};

  function post(kind, payload) {
    try { parent.postMessage({ __njsa: true, kind: kind, payload: payload }, "*"); } catch (e) {}
  }

  // ---- console capture -------------------------------------------------
  ["log", "info", "warn", "error"].forEach(function (level) {
    var original = console[level].bind(console);
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments).map(function (a) {
        try {
          if (typeof a === "string") return a;
          if (a instanceof Error) return a.message;
          return JSON.stringify(a, null, 1);
        } catch (e) { return String(a); }
      });
      post("console", { level: level, text: args.join(" ") });
      original.apply(null, arguments);
    };
  });

  window.onerror = function (message, source, line) {
    post("error", { text: String(message) + (line ? " (line " + line + ")" : "") });
  };
  window.addEventListener("unhandledrejection", function (e) {
    post("error", { text: "Unhandled promise rejection: " + String(e.reason) });
  });

  // ---- mock Next.js client router ---------------------------------------
  var routerState = { pathname: "/", params: {} };
  var listeners = [];
  function notify() { listeners.forEach(function (fn) { fn(); }); }
  var mockRouter = {
    get pathname() { return routerState.pathname; },
    push: function (href) {
      routerState.pathname = href;
      post("navigate", { pathname: href });
      notify();
    },
    replace: function (href) { this.push(href); },
    back: function () { post("console", { level: "info", text: "router.back() called" }); },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
    },
  };
  window.__njsaRouter = mockRouter;

  // ---- built-in modules --------------------------------------------------
  function buildBuiltins(React, ReactDOM) {
    var Link = function (props) {
      var href = props.href || "#";
      var rest = {};
      for (var k in props) if (k !== "children") rest[k] = props[k];
      rest.href = href;
      rest.onClick = function (e) {
        e.preventDefault();
        mockRouter.push(href);
        if (props.onClick) props.onClick(e);
      };
      return React.createElement("a", rest, props.children);
    };

    var Image = function (props) {
      var rest = {};
      for (var k in props) if (k !== "children" && k !== "priority" && k !== "fill") rest[k] = props[k];
      return React.createElement("img", rest);
    };

    function usePathname() {
      var s = React.useState(routerState.pathname);
      React.useEffect(function () {
        return mockRouter.subscribe(function () { s[1](routerState.pathname); });
      }, []);
      return s[0];
    }
    function useRouter() { return mockRouter; }
    function useParams() { return routerState.params; }

    return {
      react: React,
      "react-dom": ReactDOM,
      "react-dom/client": ReactDOM,
      "next/link": { __esModule: true, default: Link },
      "next/image": { __esModule: true, default: Image },
      "next/navigation": {
        __esModule: true,
        useRouter: useRouter,
        usePathname: usePathname,
        useParams: useParams,
        router: mockRouter,
      },
    };
  }

  // ---- module system -----------------------------------------------------
  window.__define = function (path, factory) { registry[path] = factory; };

  function resolvePath(from, spec) {
    var parts = from.split("/").slice(0, -1);
    spec.split("/").forEach(function (seg) {
      if (seg === "." || seg === "") return;
      if (seg === "..") parts.pop();
      else parts.push(seg);
    });
    var base = "/" + parts.filter(Boolean).join("/");
    var candidates = [base, base + ".tsx", base + ".ts", base + ".jsx", base + ".js", base + "/index.tsx"];
    for (var i = 0; i < candidates.length; i++) {
      if (registry[candidates[i]]) return candidates[i];
    }
    return base;
  }

  window.__run = function (entry) {
    var builtins = buildBuiltins(window.React, window.ReactDOM);

    function makeRequire(from) {
      return function (spec) {
        if (builtins[spec]) return builtins[spec];
        if (!spec.startsWith(".") && !spec.startsWith("/")) {
          throw new Error('Cannot import "' + spec + '" — only project files, react and next/* shims are available in the sandbox.');
        }
        var key = spec.startsWith("/") ? spec : resolvePath(from, spec);
        if (cache[key]) return cache[key].exports;
        if (!registry[key]) throw new Error('Module not found: "' + spec + '" (imported from ' + from + ")");
        var mod = { exports: {} };
        cache[key] = mod;
        registry[key](makeRequire(key), mod, mod.exports);
        return mod.exports;
      };
    }

    try {
      var main = makeRequire("/")(entry);
      var App = main.__esModule ? main.default : main.default || main;
      if (typeof App !== "function") {
        throw new Error(entry + " must have a default export that is a React component.");
      }
      var rootEl = document.getElementById("root");
      var root = window.ReactDOM.createRoot(rootEl);
      root.render(window.React.createElement(App));
      post("ready", {});
    } catch (err) {
      post("error", { text: err && err.message ? err.message : String(err) });
    }
  };
})();
`;

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; color: #111; background: #fff; }
  #root { min-height: 100vh; }
`;

function escapeScript(code: string) {
  return code.replace(/<\/script/gi, "<\\/script");
}

export function buildSrcDoc(modules: Record<string, string>, entry: string) {
  const defines = Object.entries(modules)
    .map(
      ([path, code]) =>
        `__define(${JSON.stringify(path)}, function (require, module, exports) {\n${escapeScript(
          code
        )}\n});`
    )
    .join("\n\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${BASE_CSS}</style>
<script src="/vendor/react.development.js"></script>
<script src="/vendor/react-dom.development.js"></script>
</head>
<body>
<div id="root"></div>
<script>${RUNTIME}</script>
<script>
${defines}
__run(${JSON.stringify(entry)});
</script>
</body>
</html>`;
}

export type SandboxMessage =
  | { __njsa: true; kind: "console"; payload: { level: "log" | "info" | "warn" | "error"; text: string } }
  | { __njsa: true; kind: "error"; payload: { text: string } }
  | { __njsa: true; kind: "navigate"; payload: { pathname: string } }
  | { __njsa: true; kind: "ready"; payload: Record<string, never> };
