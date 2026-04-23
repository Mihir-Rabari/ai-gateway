"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "surface-edge rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] shadow-panel backdrop-blur-sm",
        className,
      )}
      {...props}
    />
  );
}

export function ShellSection({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/38">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-4xl tracking-[-0.05em] text-white md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex shrink-0 items-center gap-3">{action}</div>
      ) : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Surface className={cn("p-5", className)}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
        {label}
      </p>
      <p className="mt-6 font-display text-3xl tracking-[-0.06em] text-white md:text-4xl">
        {value}
      </p>
      {hint ? <p className="mt-3 text-sm text-white/54">{hint}</p> : null}
    </Surface>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }>(
  function IconButton({ className, children, "aria-label": ariaLabel, title, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "rounded-full border border-white/10 bg-white/[0.04] p-3 text-white/66 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          className
        )}
        aria-label={ariaLabel}
        title={title ?? ariaLabel}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    busy?: boolean;
  }
>(function Button(
  { className, variant = "primary", busy, children, disabled, ...props },
  ref,
) {
  const palette = {
    primary: "bg-white text-black hover:bg-white/86",
    secondary: "border border-white/10 bg-white/8 text-white hover:bg-white/14",
    ghost: "bg-transparent text-white/72 hover:bg-white/6 hover:text-white",
    danger:
      "border border-red-300/20 bg-red-400/12 text-red-200 hover:bg-red-400/18",
  }[variant];

  return (
    <button
      ref={ref}
      disabled={disabled || busy}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        palette,
        className,
      )}
      {...props}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
});

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-white/20 focus:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      {...props}
    />
  );
});

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[132px] w-full rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/28 outline-none transition focus:border-white/20 focus:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      {...props}
    />
  );
});

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-white/82">{label}</span>
        {hint ? <span className="text-xs text-white/38">{hint}</span> : null}
      </div>
      {children}
    </label>
  );
}

export function DataTable({
  columns,
  rows,
  empty,
  className,
}: {
  columns: string[];
  rows: React.ReactNode;
  empty?: React.ReactNode;
  className?: string;
}) {
  return (
    <Surface className={cn("overflow-hidden", className)}>
      <div className="overflow-x-auto scrollbar-subtle">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.2em] text-white/42">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">{rows}</tbody>
        </table>
      </div>
      {empty}
    </Surface>
  );
}

export function MobileCardList({
  items,
  children,
  className,
}: {
  items?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-3", className)}>{items ?? children}</div>;
}

export function DetailList({
  items,
  className,
}: {
  items: Array<{ label: string; value: React.ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4"
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/36">
            {item.label}
          </p>
          <div className="mt-3 text-sm text-white/82">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Surface className="p-8 text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/34">
        Nothing Yet
      </p>
      <h3 className="mt-4 font-display text-2xl tracking-[-0.05em] text-white">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/56">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </Surface>
  );
}

export function InlineMessage({
  tone = "default",
  children,
}: {
  tone?: "default" | "danger" | "warning" | "success";
  children: React.ReactNode;
}) {
  const tones = {
    default: "border-white/10 bg-white/[0.04] text-white/64",
    danger: "border-red-300/20 bg-red-300/10 text-red-100",
    warning: "border-yellow-300/20 bg-yellow-300/10 text-yellow-100",
    success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-100",
  }[tone];

  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-sm", tones)}>
      {children}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-white/[0.06]", className)}
    />
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-white/8 text-white/72",
    success: "bg-emerald-300/12 text-emerald-100",
    warning: "bg-yellow-300/12 text-yellow-100",
    danger: "bg-red-300/12 text-red-100",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
        tones,
      )}
    >
      {children}
    </span>
  );
}
