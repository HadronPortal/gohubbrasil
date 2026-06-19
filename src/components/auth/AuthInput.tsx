import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AuthInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
};

/**
 * Standard auth field input matching the login visual identity.
 * 52px height, 8px radius, white/85 background, blue focus ring.
 */
export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ icon, className, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#718096]">
            {icon}
          </span>
        )}
        <Input
          ref={ref}
          {...props}
          className={cn(
            "h-[52px] rounded-[8px] border border-[#DDE3EE] bg-white/85 pr-3 text-[#172033] placeholder:text-[#94A3B8] backdrop-blur-md shadow-sm focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0",
            icon ? "pl-10" : "pl-3",
            className,
          )}
        />
      </div>
    );
  },
);
AuthInput.displayName = "AuthInput";