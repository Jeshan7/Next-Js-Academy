"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-ember-500 text-ink-950 hover:bg-ember-400 font-semibold shadow-glow",
  ghost: "text-mist-200 hover:bg-ink-700/60",
  outline:
    "border border-ink-600 text-mist-200 hover:border-ember-500/60 hover:text-ember-300",
  danger: "bg-signal-red/15 text-signal-red hover:bg-signal-red/25",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs rounded-md",
  md: "h-9 px-4 text-sm rounded-lg",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ember-500 disabled:opacity-40 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
