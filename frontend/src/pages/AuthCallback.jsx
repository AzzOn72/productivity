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

    // OAuth not available - redirect to login
    nav("/login", { replace: true });
  }, [nav]);

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
