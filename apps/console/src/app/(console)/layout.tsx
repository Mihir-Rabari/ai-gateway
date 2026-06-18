"use client";

import { ConsoleShell } from "@/components/console/shell";
import { UserProvider } from "@/components/UserProvider";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <ConsoleShell>{children}</ConsoleShell>
    </UserProvider>
  );
}
