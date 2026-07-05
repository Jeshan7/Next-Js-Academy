"use client";

import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { cn } from "@/lib/utils";

function Handle({ className }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={cn(
        "group relative w-px shrink-0 bg-ink-700 transition-colors hover:bg-ember-500/50 data-[resize-handle-active]:bg-ember-500",
        className
      )}
    >
      <span className="absolute inset-y-0 -left-1 -right-1" />
    </PanelResizeHandle>
  );
}

export function LessonWorkspace({
  theory,
  editor,
  preview,
}: {
  theory: React.ReactNode;
  editor: React.ReactNode;
  preview: React.ReactNode;
}) {
  return (
    <PanelGroup direction="horizontal" className="min-h-0 flex-1">
      <Panel defaultSize={35} minSize={22} className="min-w-0">
        <div className="h-full border-r border-ink-700 bg-ink-900">{theory}</div>
      </Panel>
      <Handle />
      <Panel defaultSize={35} minSize={20} className="min-w-0">
        <div className="h-full bg-ink-900">{editor}</div>
      </Panel>
      <Handle />
      <Panel defaultSize={30} minSize={18} className="min-w-0">
        <div className="h-full bg-ink-900">{preview}</div>
      </Panel>
    </PanelGroup>
  );
}
