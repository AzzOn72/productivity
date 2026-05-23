import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Settings() {
  const { user, logout } = useAuth();

  return (
    <div className="px-5 md:px-10 py-8 max-w-[900px] mx-auto pb-28">
      <div className="mb-8 fade-up">
        <div className="text-[12px] uppercase tracking-[0.22em] text-velari-textSoft mb-2">Settings</div>
        <h1 className="font-display text-4xl tracking-tight">Your Velari.</h1>
      </div>

      <div className="rounded-2xl border border-velari-border bg-velari-surface p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-velari-surfaceAlt overflow-hidden flex items-center justify-center font-display text-lg">
            {user?.picture ? <img src={user.picture} className="h-full w-full object-cover" alt="" /> : (user?.name || "U").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-display text-xl">{user?.name}</div>
            <div className="text-[13px] text-velari-textSoft">{user?.email}</div>
          </div>
          <div className="ml-auto text-[11px] uppercase tracking-[0.18em] text-velari-textSoft">
            Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : ""}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Block title="Your plan" body={
          <>
            <div className="font-display text-2xl tracking-tight capitalize">{user?.plan || "free"}</div>
            <p className="text-[13.5px] text-velari-textSoft mt-1.5">{user?.plan === "free" ? "Unlock AI prioritization and unlimited tasks." : "Thank you for supporting calm software."}</p>
            <Link to="/pricing" data-testid="upgrade-link" className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-velari-brand hover:underline underline-offset-4">
              View pricing <ArrowRight size={13} />
            </Link>
          </>
        }/>

        <Block title="Rhythm" body={
          <ul className="text-[14px] space-y-1.5">
            <li className="flex justify-between"><span className="text-velari-textSoft">Primary goal</span><span>{user?.primary_goal || "—"}</span></li>
            <li className="flex justify-between"><span className="text-velari-textSoft">Work style</span><span>{user?.work_style || "—"}</span></li>
            <li className="flex justify-between"><span className="text-velari-textSoft">Chronotype</span><span className="capitalize">{user?.chronotype || "balanced"}</span></li>
            <li className="flex justify-between"><span className="text-velari-textSoft">Capacity</span><span>{user?.daily_capacity || 4}h / day</span></li>
          </ul>
        }/>

        <Block title="Tone" body={
          <div className="flex flex-wrap gap-1.5">
            {(user?.intentions || []).map((w) => (
              <span key={w} className="px-3 py-1 rounded-full bg-velari-surfaceAlt text-[12.5px]">{w}</span>
            ))}
            {(!user?.intentions || user.intentions.length === 0) && <div className="text-[13px] text-velari-textSoft">No tone words set yet.</div>}
          </div>
        }/>

        <Block title="Account" body={
          <div className="space-y-2">
            <button onClick={logout} data-testid="settings-logout" className="w-full h-10 rounded-xl border border-velari-border hover:bg-velari-surfaceAlt text-[13.5px]">Sign out</button>
          </div>
        }/>
      </div>
    </div>
  );
}

function Block({ title, body }) {
  return (
    <div className="rounded-2xl border border-velari-border bg-velari-surface p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-velari-textSoft mb-3">{title}</div>
      {body}
    </div>
  );
}
