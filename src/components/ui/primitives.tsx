import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-indigo-100 bg-white shadow-xl shadow-indigo-600/5 dark:border-white/10 dark:bg-zinc-900",
        className
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "min-h-[44px] w-full rounded-xl border border-indigo-200 bg-white px-3.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-500 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-indigo-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-500 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-50",
        props.className
      )}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-semibold text-zinc-700 dark:text-zinc-200", className)}
      {...props}
    />
  );
}
