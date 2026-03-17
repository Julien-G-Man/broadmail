"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { setAccessToken } from "@/lib/api";
import { API_URL } from "@/lib/config";

function SessionSync() {
  const { data: session } = useSession();
  useEffect(() => {
    setAccessToken((session as any)?.accessToken ?? null);
  }, [(session as any)?.accessToken]);
  return null;
}

function KeepAlivePing() {
  const pathname = usePathname();

  useEffect(() => {
    void fetch(`${API_URL}/health`, {
      method: "GET",
      cache: "no-store",
    }).catch(() => {
      console.log("Backend server not reachable");
    });
  }, [pathname]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <SessionSync />
        <KeepAlivePing />
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
