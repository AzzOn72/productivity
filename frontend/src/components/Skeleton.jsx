/**
 * Velari skeletons — soft, premium placeholders.
 */
export function Skeleton({ className = "" }) {
  return (
    <div
      className={`relative overflow-hidden bg-velari-surfaceAlt rounded-md ${className}`}
      data-testid="skeleton"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, hsl(var(--velari-border)/0.45) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "velari-shimmer 1.8s linear infinite",
        }}
      />
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`card-soft p-6 ${className}`}>
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-7 w-40 mb-4" />
      <SkeletonText lines={2} />
    </div>
  );
}
