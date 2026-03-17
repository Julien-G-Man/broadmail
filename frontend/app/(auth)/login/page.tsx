"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Auth is disabled — redirect straight to dashboard
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-surface-2 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-2">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-brand">Broadmail</span>
        </div>
        <p className="text-text-muted text-sm mt-2">Redirecting…</p>
      </div>
    </div>
  );
}
