import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "slate",
  className,
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "red" | "indigo" | "teal" | "emerald";
  className?: string;
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300",
    red: "bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300",
    emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
