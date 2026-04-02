import { cn } from "../utils/cn";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({ children, variant = "primary", size = "md", isLoading, className, disabled, ...props }: ButtonProps) {
  const variants = {
    primary:
      "bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-brand-300 focus:ring-brand-500",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 focus:ring-slate-400",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300 focus:ring-red-400",
    ghost: "text-slate-600 hover:bg-slate-100 disabled:text-slate-300 focus:ring-slate-300",
  };
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed active:scale-[0.99]",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}
