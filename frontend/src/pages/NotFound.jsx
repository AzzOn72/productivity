import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-velari-bg text-velari-text flex flex-col" data-testid="not-found">
      <div className="px-6 py-6">
        <Link to="/"><Logo /></Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-[10.5px] uppercase tracking-[0.28em] text-velari-brand mb-3">404</div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-tight leading-[1.02] mb-4">
            This page is a quiet room.
          </h1>
          <p className="font-editorial italic text-velari-textSoft text-[16px] mb-8">
            Nothing lives here yet. Step back into the morning.
          </p>
          <Link
            to="/today"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-velari-ink text-velari-cream text-[14px] hover:-translate-y-0.5 transition-transform ease-velari"
          >
            <ArrowLeft size={14} /> Back to Today
          </Link>
        </div>
      </div>
    </div>
  );
}
