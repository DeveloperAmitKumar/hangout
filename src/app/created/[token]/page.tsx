"use client";

import { Suspense } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Check, Copy, Link2, Mail, MessageCircle, Send, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/lib/toast";
import { isSupabaseConfigured } from "@/lib/supabase";

function CreatedInner() {
  const params = useParams<{ token: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const token = params.token ?? "demo123";
  const name = search.get("name") ?? "Friday Movie Night";
  const mins = search.get("mins") ?? "60";
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${token}`
      : `/join/${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      /* clipboard may be unavailable — still show confirmation */
    }
    setCopied(true);
    toast({ title: "Invite link copied!", description: link, variant: "success" });
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-indigo-600 via-violet-600 to-fuchsia-500 px-4 py-12 dark:from-indigo-950 dark:via-violet-950 dark:to-zinc-950">
      <Card className="w-full max-w-md p-6 text-center" aria-label="Room created confirmation">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg">
          <Check className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Playground ready! 🎉</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          <strong className="text-zinc-900 dark:text-white">{name}</strong> · {mins} min session ·
          room <code className="rounded bg-zinc-100 px-1 dark:bg-white/10">{token}</code>
        </p>

        <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-white/10 dark:bg-white/5">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
            <Link2 className="h-3.5 w-3.5" aria-hidden /> Shareable link
          </p>
          <p className="mt-1 break-all text-sm font-mono text-zinc-800 dark:text-zinc-100">{link}</p>
          <Button onClick={copy} className="mt-3 w-full" aria-label="Copy invite link">
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>

        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Share via</p>
          <div className="mt-2 flex justify-center gap-2">
            {[
              {
                icon: MessageCircle,
                label: "Share on WhatsApp",
                href: `https://wa.me/?text=${encodeURIComponent(`Join my Hangout playground "${name}": ${link}`)}`,
              },
              {
                icon: Send,
                label: "Share via SMS",
                href: `sms:?body=${encodeURIComponent(`Join my Hangout playground "${name}": ${link}`)}`,
              },
              {
                icon: Mail,
                label: "Share via email",
                href: `mailto:?subject=${encodeURIComponent(`Join my Hangout playground!`)}&body=${encodeURIComponent(`Come hang out with us here: ${link}`)}`,
              },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("https") ? "_blank" : undefined}
                rel="noreferrer"
                aria-label={s.label}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-white/10 dark:text-indigo-100"
              >
                <s.icon className="h-5 w-5" aria-hidden />
              </a>
            ))}
          </div>
        </div>

        <Button
          variant="secondary"
          className="mt-5 w-full"
          onClick={() => router.push(`/room/${token}`)}
          aria-label="Enter the playground room"
        >
          Enter playground <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
        <p className="mt-2 text-xs text-zinc-400">
          {isSupabaseConfigured
            ? "Your live room is ready — share the link so friends can jump in."
            : "Preview mode — entering the demo room with sample data."}
        </p>
      </Card>
    </div>
  );
}

export default function CreatedPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading…</div>}>
      <CreatedInner />
    </Suspense>
  );
}
