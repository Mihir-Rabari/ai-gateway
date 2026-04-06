"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, setAuthToken, setRefreshToken } from "@/lib/api";

export default function ConsolePage() {
  const router = useRouter();

  useEffect(() => {
    // Read ?token= and ?rt= query params that the web app passes during cross-app navigation.
    const params = new URLSearchParams(window.location.search);
    const incomingToken = params.get("token");
    const incomingRefresh = params.get("rt");

    if (incomingToken) {
      setAuthToken(incomingToken);
      if (incomingRefresh) setRefreshToken(incomingRefresh);
      // Remove tokens from the URL immediately so they don't linger in browser history.
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (incomingToken || getAuthToken()) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <p className="text-sm text-white/60">Loading console…</p>
    </div>
  );
}
