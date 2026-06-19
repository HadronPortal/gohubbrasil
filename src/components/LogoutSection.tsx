import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { cn } from "@/lib/utils";

interface LogoutSectionProps {
  onBeforeLogout?: () => void;
  className?: string;
}

/**
 * Reusable "Sair da conta" button + confirmation modal.
 * - Clears user-private state (auth session, private localStorage keys, react-query cache).
 * - Keeps public preferences (location, theme, visual prefs).
 * - Replaces history to /login so back-button cannot re-enter authenticated pages.
 */
export function LogoutSection({ onBeforeLogout, className }: LogoutSectionProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={cn(
          "w-full h-12 rounded-[8px] bg-white text-[#D9342B] border border-[#D9342B]/40 hover:bg-[#D9342B]/5 hover:text-[#D9342B] hover:border-[#D9342B]/60 active:bg-[#D9342B]/10 active:scale-[0.99] shadow-none font-medium gap-2 transition",
          className,
        )}
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </Button>

      <LogoutConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onBeforeLogout={onBeforeLogout}
      />
    </>
  );
}