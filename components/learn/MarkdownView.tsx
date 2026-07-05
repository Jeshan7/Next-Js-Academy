"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { diagramRegistry } from "@/components/learn/diagrams";

/**
 * Renders lesson markdown. Lines of the form ::diagram{key} are replaced by
 * the registered SVG diagram component.
 */

function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: (props) => (
          <h2
            className="mt-8 mb-3 border-b border-ink-700 pb-2 text-base font-bold tracking-tight text-mist-100"
            {...props}
          />
        ),
        h3: (props) => (
          <h3 className="mt-6 mb-2 text-sm font-semibold text-ember-300" {...props} />
        ),
        p: (props) => <p className="my-3 text-[13.5px] leading-relaxed text-mist-200" {...props} />,
        ul: (props) => <ul className="my-3 list-disc space-y-1.5 pl-5 text-[13.5px] text-mist-200" {...props} />,
        ol: (props) => <ol className="my-3 list-decimal space-y-1.5 pl-5 text-[13.5px] text-mist-200" {...props} />,
        li: (props) => <li className="leading-relaxed" {...props} />,
        strong: (props) => <strong className="font-semibold text-mist-100" {...props} />,
        em: (props) => <em className="text-mist-100" {...props} />,
        blockquote: (props) => (
          <blockquote
            className="my-4 border-l-2 border-ember-500 bg-ink-800/60 px-4 py-2 text-[13.5px] italic text-mist-200"
            {...props}
          />
        ),
        a: (props) => <a className="text-ember-400 underline underline-offset-2" {...props} />,
        table: (props) => (
          <div className="my-4 overflow-x-auto rounded-lg border border-ink-600">
            <table className="w-full text-left text-[12.5px]" {...props} />
          </div>
        ),
        th: (props) => (
          <th className="border-b border-ink-600 bg-ink-800 px-3 py-2 font-semibold text-mist-100" {...props} />
        ),
        td: (props) => <td className="border-b border-ink-700/60 px-3 py-2 text-mist-200" {...props} />,
        code: ({ className, children, ...props }) => {
          const isBlock = /language-/.test(className ?? "");
          if (isBlock) {
            return (
              <code className="block font-mono text-[12px] leading-relaxed text-mist-100" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="rounded bg-ink-700/80 px-1.5 py-0.5 font-mono text-[12px] text-ember-300"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: (props) => (
          <pre className="my-4 overflow-x-auto rounded-lg border border-ink-600 bg-ink-950 p-4" {...props} />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

export function MarkdownView({ content }: { content: string }) {
  const segments = useMemo(() => {
    const parts: Array<{ type: "md"; value: string } | { type: "diagram"; key: string }> = [];
    const lines = content.split("\n");
    let buffer: string[] = [];
    const flush = () => {
      if (buffer.length) {
        parts.push({ type: "md", value: buffer.join("\n") });
        buffer = [];
      }
    };
    for (const line of lines) {
      const match = line.match(/^::diagram\{([\w-]+)\}\s*$/);
      if (match) {
        flush();
        parts.push({ type: "diagram", key: match[1] });
      } else {
        buffer.push(line);
      }
    }
    flush();
    return parts;
  }, [content]);

  return (
    <div>
      {segments.map((segment, i) => {
        if (segment.type === "diagram") {
          const Diagram = diagramRegistry[segment.key];
          return Diagram ? <Diagram key={i} /> : null;
        }
        return <Markdown key={i}>{segment.value}</Markdown>;
      })}
    </div>
  );
}
