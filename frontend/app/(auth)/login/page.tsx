"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Mail, ArrowRight, Eye, EyeOff, Send, Users, BarChart2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error("Invalid email or password");
      }
    } catch {
      toast.error("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — brand panel */}
      <div
        className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "#1a1a2e" }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #e94560, transparent)" }}
        />
        <div
          className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #e94560, transparent)" }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#e94560" }}
          >
            <Mail className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
          </div>
          <span className="font-display font-bold text-white text-xl tracking-tight">
            Broadmail
          </span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="font-display font-bold text-white leading-tight" style={{ fontSize: 38 }}>
              Reach every inbox.
              <br />
              <span style={{ color: "#e94560" }}>Drive real results.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed" style={{ color: "#9898cc", maxWidth: 380 }}>
              Send bulk emails to segmented contact lists. Track opens, clicks,
              and conversions — all in one place.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {[
              { icon: Users,    text: "Import contacts from CSV or Excel" },
              { icon: Send,     text: "Send to thousands with one click"  },
              { icon: BarChart2, text: "Real-time open & click analytics" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(233,69,96,0.15)" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: "#e94560" }} />
                </div>
                <span className="text-sm" style={{ color: "#b0b0cc" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs relative z-10" style={{ color: "#5c5c80" }}>
          Enactus KNUST · Admin access only
        </p>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#e94560" }}
          >
            <Mail className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-brand text-lg tracking-tight">
            Broadmail
          </span>
        </div>

        <div className="w-full" style={{ maxWidth: 360 }}>
          <div className="mb-8">
            <h2 className="font-display font-bold text-text-primary" style={{ fontSize: 24 }}>
              Sign in
            </h2>
            <p className="text-text-secondary text-sm mt-1.5">
              Enter your admin credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                autoFocus
                className="input w-full"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center mt-2"
              style={{ height: 42 }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  />
                  Signing in…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign in <ArrowRight size={15} />
                </span>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted mt-8">
            Having Issues? Contact The Tech Team
          </p>
        </div>
      </div>
    </div>
  );
}
