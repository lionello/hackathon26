"use client";

import { useEffect, useState } from "react";

function rawRange(from: string | null, to: string | null): string {
  return [from, to].filter(Boolean).join(" to ") || "Current flyer";
}

function formatDate(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function ValidRange({ from, to }: { from: string | null; to: string | null }) {
  // Render the raw value on the server and first client paint to avoid a
  // hydration mismatch, then upgrade to the viewer's local timezone after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const fallback = rawRange(from, to);
  if (!mounted) {
    return <span>{fallback}</span>;
  }

  const fromLabel = from ? formatDate(from) : null;
  const toLabel = to ? formatDate(to) : null;

  if (!fromLabel && !toLabel) {
    return <span>{fallback}</span>;
  }
  if (fromLabel && toLabel) {
    return <span>{`${fromLabel} – ${toLabel}`}</span>;
  }
  return <span>{fromLabel ?? toLabel}</span>;
}
