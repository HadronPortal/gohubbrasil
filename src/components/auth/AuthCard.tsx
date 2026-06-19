import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * White translucent card used across all auth screens.
 * Mirrors the login card: bg-white/90, backdrop blur, soft shadow, 8px radius.
 */
export function AuthCard({ title, description, children, className }: AuthCardProps) {
  return (
    <div
      className={cn(
        "rounded-[8px] bg-white/[0.9] p-5 shadow-lg shadow-slate-900/5 backdrop-blur-md ring-1 ring-white/40",
        className,
      )}
    >
      {title && (
        <h1 className="mb-1 text-center text-xl font-semibold text-[#172033]">
          {title}
        </h1>
      )}
      {description && (
        <p className="mb-5 text-center text-sm text-[#64748B]">{description}</p>
      )}
      {children}
    </div>
  );
}