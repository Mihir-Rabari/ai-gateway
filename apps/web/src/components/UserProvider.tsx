"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { UserProfile, api, getAuthToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface UserContextValue {
  user: UserProfile | null;
  isDeveloper: boolean | null;
  loading: boolean;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  setIsDeveloper: React.Dispatch<React.SetStateAction<boolean | null>>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isDeveloper, setIsDeveloper] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const bootstrap = async () => {
      try {
        const [me, devStatus] = await Promise.all([
          api.auth.me(),
          api.developers.getStatus().catch(() => ({ isDeveloper: false, enrolledAt: null })),
        ]);
        setUser(me);
        setIsDeveloper(devStatus.isDeveloper);
      } catch {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    void bootstrap();
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(async () => {
      try {
        const latestBalance = await api.credits.getBalance();
        setUser((prev) => (prev ? { ...prev, creditBalance: latestBalance.balance } : prev));
        if (latestBalance.balance < 10) {
          toast({
            title: "Low credits",
            description: "Your balance is below 10 credits. Recharge to avoid request failures.",
            variant: "destructive",
          });
        }
      } catch {
        // Ignore intermittent polling issues.
      }
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [toast, user]);

  return (
    <UserContext.Provider value={{ user, isDeveloper, loading, setUser, setIsDeveloper }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
