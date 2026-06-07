"use client";

import { useEffect, useState } from "react";

type LocalTimeProps = {
  value: string;
  className?: string;
};

const formatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

export function LocalTime({ value, className }: LocalTimeProps) {
  const [label, setLabel] = useState<string>("");
  const date = new Date(value);
  const utcIso = Number.isNaN(date.getTime()) ? value : date.toISOString();

  useEffect(() => {
    const parsed = new Date(value);
    setLabel(Number.isNaN(parsed.getTime()) ? value : formatter.format(parsed));
  }, [value]);

  return (
    <time className={className} dateTime={utcIso} title={utcIso} suppressHydrationWarning>
      {label || utcIso}
    </time>
  );
}
