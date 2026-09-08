"use client";

import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import React, { forwardRef, useId } from "react";
import { Loader2 } from "lucide-react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

// ── Surface (matches web app Card) ──────────────────────────────
export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 overflow-hidden rounded-4xl bg-[#0a0a0a] py-6 text-sm text-white shadow-md ring-1 ring-white/10",
        className,
      )}
      {...props}
    />
  );
}

// ── ShellSection (page header) ───────────────────────────────────
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
          <p className="mb-2 text-xs text-white/40">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-white/50">
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

// ── MetricCard (matches web StatsCard) ───────────────────────────
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
    <Surface className={cn("gap-2 px-6", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-white/60">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {hint ? <p className="text-xs text-white/40">{hint}</p> : null}
    </Surface>
  );
}

// ── IconButton ───────────────────────────────────────────────────
export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { "aria-label": string }
>(function IconButton(
  { className, children, "aria-label": ariaLabel, title, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "rounded-lg border border-white/10 bg-white/5 p-2.5 text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
});

// ── Button (matches web Button: rounded-4xl, h-9) ───────────────
export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    busy?: boolean;
    asChild?: boolean;
  }
>(function Button(
  {
    className,
    variant = "primary",
    busy,
    asChild = false,
    children,
    disabled,
    ...props
  },
  ref,
) {
  const palette = {
    primary: "bg-white text-black hover:bg-white/90",
    secondary:
      "border border-white/10 bg-white/5 text-white hover:bg-white/10",
    ghost: "bg-transparent text-white/60 hover:bg-white/5 hover:text-white",
    danger:
      "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  }[variant];

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      disabled={disabled || busy}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-4xl px-3 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4",
        palette,
        className,
      )}
      {...props}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <Slottable>{children}</Slottable>
    </Comp>
  );
});

// ── TextInput ───────────────────────────────────────────────────
export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      {...props}
    />
  );
});

// ── TextArea ────────────────────────────────────────────────────
export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function TextArea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[120px] w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-white/20 focus:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
        className,
      )}
      {...props}
    />
  );
});

// ── Field ───────────────────────────────────────────────────────
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const generatedId = useId();
  const id = children.props.id || generatedId;
  const hintId = `${id}-hint`;

  return (
    <div className="block space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm font-medium text-white/80">
          {label}
        </label>
        {hint ? (
          <span id={hintId} className="text-xs text-white/40">
            {hint}
          </span>
        ) : null}
      </div>
      {React.cloneElement(children, {
        id,
        "aria-describedby": hint
          ? children.props["aria-describedby"]
            ? `${children.props["aria-describedby"]} ${hintId}`
            : hintId
          : children.props["aria-describedby"],
      })}
    </div>
  );
}

// ── DataTable ───────────────────────────────────────────────────
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
          <thead className="bg-white/5 text-xs text-white/50">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-6 py-4 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">{rows}</tbody>
        </table>
      </div>
      {empty}
    </Surface>
  );
}

// ── MobileCardList ──────────────────────────────────────────────
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

// ── DetailList ──────────────────────────────────────────────────
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
          className="rounded-lg border border-white/10 bg-black/40 p-4"
        >
          <p className="text-xs text-white/50">{item.label}</p>
          <div className="mt-2 text-sm text-white/80">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────
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
    <Surface className="px-6 py-12 text-center">
      <p className="text-xs text-white/40">{title}</p>
      <h3 className="mt-3 text-lg font-semibold text-white">
        Nothing here yet
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </Surface>
  );
}

// ── InlineMessage ───────────────────────────────────────────────
export function InlineMessage({
  tone = "default",
  className,
  children,
}: {
  tone?: "default" | "danger" | "warning" | "success";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    default: "border-white/10 bg-white/5 text-white/60",
    danger: "border-red-500/30 bg-red-500/10 text-red-300",
    warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  }[tone];

  const role = tone === "danger" || tone === "warning" ? "alert" : "status";
  const ariaLive = tone === "danger" || tone === "warning" ? "assertive" : "polite";

  return (
    <div
      className={cn("rounded-2xl border px-4 py-3 text-sm", tones, className)}
      role={role}
      aria-live={ariaLive}
    >
      {children}
    </div>
  );
}

// ── SkeletonBlock ───────────────────────────────────────────────
export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-white/10", className)}
    />
  );
}

// ── Badge (matches web Badge: rounded-3xl, h-5) ──────────────────
export function Badge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const tones = {
    default: "bg-white/10 text-white/70",
    success: "bg-emerald-500/10 text-emerald-300",
    warning: "bg-yellow-500/10 text-yellow-300",
    danger: "bg-red-500/10 text-red-300",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex h-5 w-fit items-center gap-1 rounded-3xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones,
      )}
    >
      {children}
    </span>
  );
}
