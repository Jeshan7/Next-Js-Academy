import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "ember" | "green" | "red";
  className?: string;
}) {
  const tones = {
    neutral: "bg-ink-700 text-mist-300",
    ember: "bg-ember-500/15 text-ember-400",
    green: "bg-signal-green/15 text-signal-green",
    red: "bg-signal-red/15 text-signal-red",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
