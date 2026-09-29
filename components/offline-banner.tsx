"use client";

import { useEffect, useState } from "react";
import type { Dictionary } from "@/lib/i18n";

export function OfflineBanner({ dict }: { dict: Dictionary }) {
  const [online, setOnline] = useState(true);
  const [returned, setReturned] = useState(false);

  useEffect(() => {
    const sync = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) setReturned(true);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (online && !returned) return null;
  return (
    <p className={`mb-4 rounded-2xl px-4 py-3 text-sm ${online ? "bg-ocean/10 text-ocean" : "bg-coral/15 text-ink"}`}>
      {online ? dict.offline.back : dict.offline.offline}
    </p>
  );
}
