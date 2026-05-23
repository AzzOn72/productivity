export function Logo({ className = "", size = 28, withWord = true }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid="velari-logo">
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <circle cx="20" cy="20" r="19" stroke="currentColor" strokeOpacity="0.16" />
        <path
          d="M9 12 L20 31 L31 12"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="20" r="2.4" fill="hsl(var(--velari-brand))" />
      </svg>
      {withWord && (
        <span className="font-display text-[19px] tracking-tight font-medium">
          Velari
        </span>
      )}
    </div>
  );
}
