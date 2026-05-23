import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "@/components/Logo";

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="sticky top-0 z-50 px-4 md:px-8 pt-4">
      <nav
        className={`mx-auto max-w-6xl flex items-center justify-between rounded-full px-4 md:px-6 py-2.5 transition-all duration-500 ease-velari ${
          scrolled ? "glass shadow-[0_8px_30px_-15px_rgba(0,0,0,0.12)]" : "bg-transparent"
        }`}
        data-testid="marketing-nav"
      >
        <Link to="/" className="text-velari-text">
          <Logo />
        </Link>
        <div className="hidden md:flex items-center gap-7 text-[14px] text-velari-textSoft">
          <a href="/#features" className="hover:text-velari-text transition-colors" data-testid="nav-features">Features</a>
          <a href="/#philosophy" className="hover:text-velari-text transition-colors" data-testid="nav-philosophy">Philosophy</a>
          <Link to="/pricing" className={`hover:text-velari-text transition-colors ${location.pathname === '/pricing' ? 'text-velari-text' : ''}`} data-testid="nav-pricing">Pricing</Link>
          <a href="/#compare" className="hover:text-velari-text transition-colors" data-testid="nav-compare">vs Sunsama</a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden sm:inline-flex text-[14px] px-3.5 py-2 rounded-full text-velari-text hover:bg-velari-surfaceAlt transition-colors"
            data-testid="nav-login"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center text-[14px] px-4 py-2 rounded-full bg-velari-ink text-velari-cream hover:opacity-90 transition-all ease-velari hover:-translate-y-0.5"
            data-testid="nav-signup"
          >
            Begin
          </Link>
        </div>
      </nav>
    </div>
  );
}
