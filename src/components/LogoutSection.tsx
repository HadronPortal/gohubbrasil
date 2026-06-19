import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
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
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // useQueryClient may throw if no provider; guard it
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  try {
    queryClient = useQueryClient();
  } catch {
    queryClient = null;
  }

  const handleConfirm = async () => {
    setLoggingOut(true);
    try {
      onBeforeLogout?.();

      // 1. Supabase signOut
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // 2. Clear React Query cache
      try {
        queryClient?.clear();
      } catch {
        /* noop */
      }

      // 3. Clear user-private localStorage keys (keep public prefs like location/theme)
      try {
        const PRIVATE_KEY_PATTERNS = [
          /^selectedBarbershop/i,
          /appointment/i,
          /^role$/i,
          /^force_barber_panel$/i,
          /^sb-.*-auth-token$/i,
          /^supabase\.auth/i,
        ];
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && PRIVATE_KEY_PATTERNS.some((p) => p.test(key))) {
            toRemove.push(key);
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
        // Session storage is always private
        sessionStorage.clear();
      } catch {
        /* noop */
      }

      // 4. Redirect with replace so back button cannot return to authenticated routes
      navigate("/login", { replace: true });
    } catch (err: any) {
      console.error("Logout failed:", err);
      toast.error("Não foi possível sair. Tente novamente.");
      setLoggingOut(false);
      setConfirmOpen(false);
    }
  };

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

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !loggingOut && setConfirmOpen(open)}>
        <AlertDialogContent className="max-w-[360px] rounded-[12px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você precisará entrar novamente para acessar seus agendamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-2">
            <AlertDialogCancel disabled={loggingOut} className="rounded-[8px]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={loggingOut}
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              className="rounded-[8px] bg-[#D9342B] hover:bg-[#bf2d25] text-white gap-2"
            >
              {loggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {loggingOut && (
        <div className="fixed inset-0 z-[100]">
          <LoadingScreen />
        </div>
      )}
    </>
  );
}