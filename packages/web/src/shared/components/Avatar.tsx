import { cn } from "../utils/cn";

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  xs: "h-6 w-6 text-xs",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const colorPairs = [
  "bg-slate-100 text-slate-700",
  "bg-brand-50 text-brand-700",
  "bg-emerald-50 text-emerald-700",
  "bg-violet-50 text-violet-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
  "bg-pink-50 text-pink-700",
];

function getInitials(name?: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColorIndex(name?: string) {
  if (!name) return 0;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % colorPairs.length;
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  const colorClass = colorPairs[getColorIndex(name)];

  if (src) {
    return (
      <img
        src={src}
        alt={name || "Avatar"}
        className={cn("rounded-full object-cover ring-2 ring-white shadow-sm", sizeMap[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-semibold ring-2 ring-white shadow-sm",
        sizeMap[size],
        colorClass,
        className
      )}
    >
      {initials}
    </span>
  );
}

interface AvatarGroupProps {
  children: React.ReactNode;
  max?: number;
  size?: AvatarProps["size"];
  className?: string;
}

export function AvatarGroup({ children, max, size = "sm", className }: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : [children];
  const visible = max ? childArray.slice(0, max) : childArray;
  const overflow = max ? childArray.length - max : 0;

  return (
    <div className={cn("flex items-center", className)}>
      {visible.map((child, idx) => (
        <div
          key={idx}
          className={cn("relative overflow-hidden rounded-full ring-2 ring-white", idx > 0 && "-ml-2")}
        >
          {child}
        </div>
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "relative -ml-2 flex items-center justify-center rounded-full bg-slate-100 font-medium text-slate-600 ring-2 ring-white",
            sizeMap[size]
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
