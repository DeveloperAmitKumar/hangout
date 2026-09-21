"use client";

import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useToast } from "@/lib/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-indigo-100 bg-white/95 px-4 py-3 shadow-2xl shadow-indigo-600/20 backdrop-blur dark:border-white/10 dark:bg-zinc-900/95"
        >
          {t.variant === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden />
          ) : t.variant === "error" ? (
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" aria-hidden />
          ) : (
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-white">{t.title}</p>
            {t.description && (
              <p className="truncate text-[13px] text-zinc-500 dark:text-zinc-400">{t.description}</p>
            )}
          </div>
          <button
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
