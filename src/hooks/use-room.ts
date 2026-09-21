"use client";

import { useEffect, useState } from "react";

export function useCountdown(expiresAt: string, tickMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(t);
  }, [tickMs]);

  const remainingMs = new Date(expiresAt).getTime() - now;
  return { remainingMs, expired: remainingMs <= 0 };
}

export function useLocalAvatar() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  function onFile(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return url;
    });
  }

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return { preview, file, onFile };
}
