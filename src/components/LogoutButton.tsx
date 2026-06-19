import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
}

/**
 * Compact logout trigger used in admin / barber / superadmin top bars.
 * Opens the shared GoHub logout confirmation modal — no inline signOut logic.
 */
export function LogoutButton({ className, showText = false }: LogoutButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size={showText ? "default" : "icon"}
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-2 rounded-[8px] text-[#64748B] hover:bg-[#DC2626]/10 hover:text-[#DC2626]",
          className,
        )}
      >
        <LogOut className="w-5 h-5" />
        {showText && <span className="text-sm font-medium">Sair</span>}
      </Button>

      <LogoutConfirmDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
