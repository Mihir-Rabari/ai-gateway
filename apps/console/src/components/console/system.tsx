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
    <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-white/38">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-4xl tracking-[-0.05em] text-white md:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/58 md:text-base">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-3">{action}</div> : null}
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
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">{label}</p>
      <p className="mt-6 font-display text-3xl tracking-[-0.06em] text-white md:text-4xl">{value}</p>
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
>(function Button({ className, variant = "primary", busy, children, disabled, ...props }, ref) {
  const palette = {
    primary: "bg-white text-black hover:bg-white/86 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    secondary: "border border-white/10 bg-white/8 text-white hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    ghost: "bg-transparent text-white/72 hover:bg-white/6 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
    danger: "border border-red-300/20 bg-red-400/12 text-red-200 hover:bg-red-400/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50",
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

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className, ...props }, ref) {
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
  },
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
