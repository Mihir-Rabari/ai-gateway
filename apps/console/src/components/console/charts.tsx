"use client";

import { cn } from "@/lib/utils";

export function MiniBarChart({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);

  return (
    <div className={cn("flex h-40 items-end gap-2", className)}>
      {values.map((value, index) => (
        <div key={`${index}-${value}`} className="flex flex-1 flex-col justify-end">
          <div
            className="rounded-t-[18px] bg-gradient-to-t from-white to-white/35 transition-all"
            style={{ height: `${Math.max(10, (value / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function LinePulse({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length === 0) {
    return <div className={cn("h-36 rounded-[24px] bg-white/[0.03]", className)} />;
  }

  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 100 - (value / max) * 84;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className={cn("rounded-[24px] border border-white/8 bg-white/[0.03] p-4", className)}>
      <svg viewBox="0 0 100 100" className="h-36 w-full overflow-visible">
        <defs>
          <linearGradient id="pulse-line" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.45)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.98)" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="url(#pulse-line)"
          strokeWidth="2.2"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      </svg>
    </div>
  );
}

export function TrendAreaChart({
  values,
  labels,
  className,
}: {
  values: number[];
  labels?: string[];
  className?: string;
}) {
  if (values.length === 0) {
    return <div className={cn("h-52 rounded-[24px] bg-white/[0.03]", className)} />;
  }

  const max = Math.max(...values, 1);
  const linePoints = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 92 - (value / max) * 70;
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,100 ${linePoints} 100,100`;

  return (
    <div className={cn("rounded-[24px] border border-white/8 bg-white/[0.03] p-4", className)}>
      <svg viewBox="0 0 100 100" className="h-40 w-full overflow-visible">
        <defs>
          <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>
          <linearGradient id="trend-stroke" x1="0" x2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.96)" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#trend-fill)" />
        <polyline
          fill="none"
          stroke="url(#trend-stroke)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          points={linePoints}
        />
      </svg>
      {labels?.length ? (
        <div className="mt-3 grid grid-cols-7 gap-2 text-[10px] uppercase tracking-[0.18em] text-white/32">
          {labels.map((label) => (
            <span key={label} className="truncate">
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function HorizontalMeterList({
  items,
  className,
}: {
  items: Array<{ label: string; value: number; hint?: string }>;
  className?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-white">{item.label}</p>
              {item.hint ? <p className="mt-1 text-xs text-white/40">{item.hint}</p> : null}
            </div>
            <p className="text-sm text-white/64">{item.value.toLocaleString()}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-white/35 to-white"
              style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
