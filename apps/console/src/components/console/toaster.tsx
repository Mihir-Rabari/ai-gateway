"use client";

import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[min(92vw,24rem)] flex-col gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-[24px] border p-4 shadow-panel backdrop-blur ${
            toast.variant === "destructive"
              ? "border-red-300/20 bg-[#180b0b]/95"
              : "border-white/12 bg-[#0e0e0e]/95"
          }`}
        >
          {toast.title ? <p className="text-sm font-medium text-white">{toast.title}</p> : null}
          {toast.description ? <p className="mt-1 text-sm leading-6 text-white/60">{toast.description}</p> : null}
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
<<<<<<< Updated upstream
            className="mt-3 text-xs uppercase tracking-[0.22em] text-white/38 transition hover:text-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
=======
            className="mt-3 rounded text-xs uppercase tracking-[0.22em] text-white/38 transition hover:text-white/72 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
>>>>>>> Stashed changes
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
