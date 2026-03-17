"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { setAccessToken } from "@/lib/api";

function SessionSync() {
  const { data: session } = useSession();
  useEffect(() => {
    setAccessToken((session as any)?.accessToken ?? null);
  }, [(session as any)?.accessToken]);
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
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
