import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 px-6 py-12 text-center dark:border-white/10 dark:bg-white/5">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-600/25">
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <p className="text-sm font-bold text-zinc-900 dark:text-white">{title}</p>
      <p className="max-w-xs text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">{hint}</p>
      {action}
    </div>
  );
}
