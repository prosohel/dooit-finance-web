"use client";

import { useEffect, useState } from "react";
import { IconClock, IconAlertOctagon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function diffParts(deadline, now) {
  const diffMs = new Date(deadline).getTime() - now;
  const overdue = diffMs < 0;
  const abs = Math.abs(diffMs);
  const hours = Math.floor(abs / (1000 * 60 * 60));
  const minutes = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
  return { overdue, hours, minutes };
}

export default function SlaCountdown({ deadline, className }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!deadline) return null;

  const { overdue, hours, minutes } = diffParts(deadline, now);
  const urgent = !overdue && hours < 2;

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold",
        overdue ? "text-danger" : urgent ? "text-danger" : "text-muted-foreground",
        className,
      )}
      title={`SLA deadline calculated as of last refresh (${new Date(now).toLocaleTimeString()})`}
    >
      {overdue ? <IconAlertOctagon className="size-3.5" /> : <IconClock className="size-3.5" />}
      <span>
        {overdue
          ? `Overdue by ${hours}h ${minutes}m`
          : `${hours}h ${minutes}m remaining`}
      </span>
    </span>
  );
}
