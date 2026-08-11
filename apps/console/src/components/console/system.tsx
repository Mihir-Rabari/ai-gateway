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

export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-[#09090b] shadow-sm",
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
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-zinc-800 pb-6",
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-4 font-mono text-2xl font-bold tracking-tight text-zinc-100 md:text-3xl">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </Surface>
  );
}

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
        "rounded-md border border-zinc-800 bg-zinc-900 p-2.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700",
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
    primary: "bg-zinc-100 text-zinc-950 hover:bg-zinc-200",
    secondary:
      "border border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
    ghost: "bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
    danger:
      "border border-red-900/40 bg-red-950/30 text-red-300 hover:bg-red-900/30",
  }[variant];

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref}
      disabled={disabled || busy}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700",
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

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700",
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
        "min-h-[120px] w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-zinc-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-700",
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
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string }>;
}) {
  const generatedId = useId();
  const id = children.props.id || generatedId;
  const hintId = `${id}-hint`;

  return (
    <div className="block space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
          {label}
        </label>
        {hint ? (
          <span id={hintId} className="text-xs text-zinc-500">
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
          <thead className="bg-zinc-900/50 border-b border-zinc-800 text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">{rows}</tbody>
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
          className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            {item.label}
          </p>
          <div className="mt-2 text-sm text-zinc-300">{item.value}</div>
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
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
        Nothing Yet
      </p>
      <h3 className="mt-3 text-lg font-bold text-zinc-100">
        {title}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
        {description}
      </p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </Surface>
  );
}

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
    default: "border-zinc-800 bg-zinc-900 text-zinc-400",
    danger: "border-red-900/40 bg-red-950/20 text-red-300",
    warning: "border-yellow-900/40 bg-yellow-950/20 text-yellow-300",
    success: "border-emerald-900/40 bg-emerald-950/20 text-emerald-300",
  }[tone];

  const role = tone === "danger" || tone === "warning" ? "alert" : "status";
  const ariaLive = tone === "danger" || tone === "warning" ? "assertive" : "polite";

  return (
    <div
      className={cn("rounded-md border px-4 py-3 text-sm", tones, className)}
      role={role}
      aria-live={ariaLive}
    >
      {children}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-zinc-900 border border-zinc-800", className)}
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
    default: "bg-zinc-900 text-zinc-400",
    success: "bg-emerald-950/30 text-emerald-400",
    warning: "bg-yellow-950/30 text-yellow-400",
    danger: "bg-red-950/30 text-red-400",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded border border-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        tones,
      )}
    >
      {children}
    </span>
  );
}
