import Link from "next/link";
import { Mail } from "lucide-react";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: "#1a1a2e" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "#e94560" }}
        >
          <Mail className="w-4 h-4 text-white" />
        </div>
        <span className="font-display font-bold text-white text-lg tracking-tight">
          Broadmail
        </span>
      </div>

      {/* Large ghost number */}
      <p
        className="font-display font-bold leading-none select-none"
        style={{ fontSize: 120, color: "rgba(233,69,96,0.12)" }}
      >
        404
      </p>

      <div className="text-center -mt-4 space-y-2">
        <h1 className="font-display font-bold text-white" style={{ fontSize: 24 }}>
          Page not found
        </h1>
        <p className="text-sm" style={{ color: "#9898cc" }}>
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>

      <div className="flex gap-3 mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: "#e94560" }}
        >
          Go to Dashboard
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:text-white"
          style={{
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#9898cc",
          }}
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
