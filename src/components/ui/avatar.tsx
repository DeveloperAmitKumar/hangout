import { cn } from "@/lib/utils";

export function Avatar({
  src,
  name,
  size = 40,
  online,
  className,
}: {
  src: string;
  name: string;
  size?: number;
  online?: boolean;
  className?: string;
}) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name}'s avatar`}
        width={size}
        height={size}
        loading="lazy"
        className="rounded-full bg-gradient-to-br from-indigo-200 to-violet-200 object-cover ring-2 ring-white dark:ring-zinc-900"
        style={{ width: size, height: size }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <span
        aria-hidden
        className="flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white"
        style={{ width: size, height: size, fontSize: size * 0.36, display: "none" }}
      >
        {initials}
      </span>
      {online !== undefined && (
        <span
          aria-label={online ? "Online" : "Offline"}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-zinc-900",
            online ? "bg-emerald-500" : "bg-zinc-400"
          )}
        />
      )}
    </span>
  );
}

export function Badge({
  children,
  tone = "indigo",
}: {
  children: React.ReactNode;
  tone?: "indigo" | "amber" | "emerald" | "rose" | "zinc";
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-100",
    amber: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
    emerald: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
    rose: "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-200",
  };
  return (
    <span
      className={`inline-flex min-h-[24px] items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-xl bg-indigo-100 dark:bg-white/10", className)}
    />
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-label="Loading messages">
      {[70, 45, 85, 55, 60].map((w, i) => (
        <div key={i} className={`flex gap-2 ${i % 2 ? "justify-end" : ""}`}>
          {i % 2 === 0 && <Skeleton className="h-8 w-8 !rounded-full" />}
          <Skeleton className="h-14" />
          <style>{``}</style>
          <div style={{ width: `${w}%` }}>
            <Skeleton className="h-14 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
