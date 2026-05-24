import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import { ArrowRight, AlertCircle } from "lucide-react";
import { formatApiError } from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name || "friend"}.`);
      nav(u.onboarded ? "/today" : "/onboarding", { replace: true });
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-velari-bg">
      <div className="hidden lg:flex relative overflow-hidden border-r border-velari-border focus-bg">
        <div className="absolute inset-0 grain" />
        <div className="relative m-auto px-16 max-w-lg">
          <Logo size={32} />
          <p className="font-editorial italic text-3xl mt-12 leading-snug">
            "I open Velari before my email now. That's the whole review."
          </p>
          <div className="mt-6 text-[13px] text-velari-textSoft">Idris O. — Founder, Lagos</div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="px-6 lg:px-10 py-6 flex items-center justify-between">
          <Link to="/" className="lg:hidden"><Logo /></Link>
          <div className="ml-auto text-[13px] text-velari-textSoft">
            New here?{" "}
            <Link to="/signup" className="text-velari-text underline underline-offset-4">Create an account</Link>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <h1 className="font-display text-4xl tracking-tight mb-2">Welcome back.</h1>
            <p className="text-velari-textSoft mb-10 text-[15px]">Pick up where you left off.</p>

            <form onSubmit={submit} className="space-y-3">
              <Field
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                testid="login-email"
                autoComplete="email"
              />
              <Field
                label="Password"
                value={password}
                onChange={setPassword}
                type="password"
                testid="login-password"
                autoComplete="current-password"
              />
              {error && (
                <div className="flex items-start gap-2 text-[13px] text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5" data-testid="login-error">
                  <AlertCircle size={14} className="mt-0.5" />
                  <div>{error}</div>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                data-testid="login-submit"
                className="w-full h-11 rounded-xl bg-velari-ink text-velari-cream text-[14.5px] font-medium flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform ease-velari disabled:opacity-60 disabled:translate-y-0"
              >
                {busy ? "Signing in…" : "Sign in"}
                {!busy && <ArrowRight size={15} />}
              </button>
            </form>

            <p className="mt-8 text-[12px] text-velari-textSoft text-center">
              By continuing, you agree to our calm-by-design <a href="#" className="underline">terms</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", testid, autoComplete }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-[0.18em] text-velari-textSoft mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        data-testid={testid}
        required
        className="w-full h-11 px-3.5 rounded-xl bg-velari-surface border border-velari-border focus:outline-none focus:ring-2 focus:ring-velari-brand/40 focus:border-velari-brand text-[14.5px]"
      />
    </label>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.32A9 9 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.98 10.72A5.4 5.4 0 0 1 3.7 9c0-.6.1-1.18.28-1.72V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.02-2.32z" fill="#FBBC05"/>
      <path d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.02 2.32C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
