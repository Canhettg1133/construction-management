interface SkeletonCardProps {
  lines?: number;
}

export function SkeletonCard({ lines = 2 }: SkeletonCardProps) {
  return (
    <div className="app-card skeleton-shimmer">
      <div className="h-4 w-40 rounded bg-slate-200/90" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, idx) => (
          <div key={idx} className="h-3 rounded bg-slate-100/90" />
        ))}
      </div>
    </div>
  );
}
