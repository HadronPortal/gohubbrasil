import { ReactNode } from "react";
import loginBg from "@/assets/login/gohub-beauty-background.webp";
import gohubLogo from "@/assets/login/gohub-logo.png";

interface AuthPageShellProps {
  children: ReactNode;
  showLogo?: boolean;
}

/**
 * Shared visual shell for auth pages (login, forgot, reset, confirmations).
 * Background image + safe-area padding + centered logo above content.
 */
export function AuthPageShell({ children, showLogo = true }: AuthPageShellProps) {
  return (
    <div
      className="gohub-client relative w-full min-h-[100dvh] overflow-x-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {/* Background image (full bleed, no overlay) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <img
          src={loginBg}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center px-5 py-8">
        <div className="w-full max-w-[400px]">
          {showLogo && (
            <div className="mb-6 flex justify-center">
              <img
                src={gohubLogo}
                alt="GoHub"
                className="h-16 w-auto object-contain"
              />
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}