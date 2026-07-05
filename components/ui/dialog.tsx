"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full rounded-xl border border-ink-600 bg-ink-850 shadow-panel max-h-[85vh] flex flex-col",
          wide ? "max-w-4xl" : "max-w-lg"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
          <h2 className="text-sm font-semibold text-mist-100">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded p-1 text-mist-400 hover:bg-ink-700 hover:text-mist-100"
          >
            <X size={16} />
          </button>
        </header>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
