import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";
import AIAssistant from "@/components/AIAssistant";
import StreakBadge from "@/components/StreakBadge";
import { api } from "@/lib/api";
import {
  Sun,
  CalendarDays,
  CheckCircle2,
  Sparkles,
  Target,
  LineChart,
  Settings as SettingsIcon,
  LogOut,
  Sparkle,
  Moon,
  Plus,
  Crown,
} from "lucide-react";

const NAV = [
  { to: "/today", label: "Today", icon: Sun, testid: "nav-today" },
  { to: "/tasks", label: "Tasks", icon: CheckCircle2, testid: "nav-tasks" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "nav-calendar" },
  { to: "/focus", label: "Focus", icon: Target, testid: "nav-focus" },
  { to: "/review", label: "Weekly Review", icon: LineChart, testid: "nav-review" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [streak, setStreak] = useState({ current: 0, longest: 0 });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/streak");
        setStreak(data);
      } catch {}
    })();
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setDark(document.documentElement.classList.contains("dark"));
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-velari-bg text-velari-text">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[244px] shrink-0 flex-col border-r border-velari-border bg-velari-bg/60" data-testid="app-sidebar">
        <div className="px-6 pt-7 pb-6">
          <Link to="/today"><Logo /></Link>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {NAV.map(({ to, label, icon: Icon, testid }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testid}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14.5px] transition-all ease-velari ${
                  isActive
                    ? "bg-velari-surface text-velari-text shadow-[0_1px_0_0_hsl(var(--velari-border))]"
                    : "text-velari-textSoft hover:text-velari-text hover:bg-velari-surface/60"
                }`
              }
            >
              <Icon size={17} className="opacity-80" />
              <span className="font-display tracking-tight">{label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => setAiOpen(true)}
            data-testid="nav-ai"
            className="w-full mt-3 flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14.5px] text-velari-textSoft hover:text-velari-text hover:bg-velari-surface/60 transition-colors"
          >
            <Sparkles size={17} className="opacity-80" />
            <span className="font-display tracking-tight">AI Coach</span>
            <span className="ml-auto text-[10px] tracking-[0.18em] uppercase text-velari-brand">Live</span>
          </button>
        </nav>

        <div className="px-3 pb-3 space-y-1">
          <NavLink
            to="/settings"
            data-testid="nav-settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14.5px] ${
                isActive ? "bg-velari-surface text-velari-text" : "text-velari-textSoft hover:text-velari-text hover:bg-velari-surface/60"
              }`
            }
          >
            <SettingsIcon size={17} className="opacity-80" />
            <span className="font-display tracking-tight">Settings</span>
          </NavLink>

          <button
            onClick={toggleTheme}
            data-testid="theme-toggle"
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14.5px] text-velari-textSoft hover:text-velari-text hover:bg-velari-surface/60 transition-colors"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
            <span className="font-display tracking-tight">{dark ? "Light" : "Dark"} mode</span>
          </button>
        </div>

        <div className="m-3 p-3 rounded-2xl bg-velari-surface border border-velari-border space-y-2.5" data-testid="sidebar-user">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-velari-surfaceAlt flex items-center justify-center font-display text-[13px] overflow-hidden">
              {user?.picture ? (
                <img src={user.picture} alt="" className="h-full w-full object-cover" />
              ) : (
                (user?.name || user?.email || "U").slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium truncate">{user?.name}</div>
              <div className="text-[11px] text-velari-textSoft truncate capitalize">{user?.plan || "free"} plan</div>
            </div>
            <button onClick={handleLogout} data-testid="logout-btn" className="text-velari-textSoft hover:text-velari-text">
              <LogOut size={15} />
            </button>
          </div>

          {streak.current > 0 && (
            <div className="flex items-center justify-between gap-2">
              <StreakBadge current={streak.current} longest={streak.longest} compact />
              <div className="text-[10.5px] text-velari-textSoft">Longest: {streak.longest}d</div>
            </div>
          )}

          {(user?.plan === "free" || !user?.plan) && (
            <Link
              to="/pricing"
              data-testid="sidebar-upgrade"
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-velari-ink text-velari-cream hover:-translate-y-0.5 transition-transform ease-velari"
            >
              <div className="flex items-center gap-1.5">
                <Crown size={12} className="text-velari-brand" />
                <span className="text-[12px] tracking-tight">Unlock Pro</span>
              </div>
              <span className="text-[10.5px] opacity-70">$5/mo</span>
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 glass border-b border-velari-border px-4 py-3 flex items-center justify-between">
        <Link to="/today"><Logo size={22} /></Link>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiOpen(true)} className="p-2 rounded-full bg-velari-surfaceAlt" data-testid="mobile-ai">
            <Sparkles size={16} />
          </button>
          <button onClick={toggleTheme} className="p-2 rounded-full bg-velari-surfaceAlt">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 pt-14 md:pt-0">
        {children}
      </main>

      {/* Floating AI button (desktop) */}
      <button
        onClick={() => setAiOpen(true)}
        className="hidden md:flex fixed bottom-6 right-6 z-40 items-center gap-2 px-4 py-3 rounded-full bg-velari-ink text-velari-cream shadow-[0_18px_50px_-15px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-transform ease-velari"
        data-testid="floating-ai-btn"
      >
        <Sparkle size={16} />
        <span className="font-display text-sm tracking-tight">Ask Velari</span>
      </button>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 glass rounded-full p-1.5 flex items-center justify-around" data-testid="mobile-nav">
        {NAV.map(({ to, icon: Icon, testid }) => (
          <NavLink
            key={to}
            to={to}
            data-testid={`m-${testid}`}
            className={({ isActive }) =>
              `p-2.5 rounded-full ${isActive ? "bg-velari-surface text-velari-text" : "text-velari-textSoft"}`
            }
          >
            <Icon size={18} />
          </NavLink>
        ))}
      </nav>

      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
