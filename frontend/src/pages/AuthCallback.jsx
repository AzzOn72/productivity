import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    const sessionId = m ? decodeURIComponent(m[1]) : null;

    // Clear hash immediately
    window.history.replaceState(null, "", window.location.pathname);

    if (!sessionId) {
      nav("/login", { replace: true });
      return;
    }

    (async () => {
      try {
        const { data } = await api.post(
          "/auth/session",
          { session_id: sessionId },
          { headers: { "X-Session-ID": sessionId } },
        );
        if (data.access_token) localStorage.setItem("velari_token", data.access_token);
        setUser(data.user);
        nav(data.user?.onboarded ? "/today" : "/onboarding", { replace: true });
      } catch (e) {
        nav("/login?error=session", { replace: true });
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-velari-bg">
      <div className="flex flex-col items-center gap-5">
        <Logo size={36} />
        <div className="h-9 w-9 rounded-full border-2 border-velari-border border-t-velari-brand animate-spin" />
        <p className="text-sm text-velari-textSoft font-display tracking-wide">Bringing you in…</p>
      </div>
    </div>
  );
}
