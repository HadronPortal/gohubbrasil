import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBeforeLogout?: () => void;
}

/**
 * Shared logout confirmation dialog, used by every role
 * (client, barber, owner, superadmin).
 *
 * - GoHub identity (white surface, #DC2626 destructive, Poppins, 8px radius).
 * - Closes on Cancel & Escape; blocked while logging out (no outside-click dismiss).
 * - Calls supabase.auth.signOut(), clears private state and react-query cache,
 *   then navigates to /login with replace so back-button cannot return.
 */
export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onBeforeLogout,
}: LogoutConfirmDialogProps) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

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

      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      try {
        queryClient?.clear();
      } catch {
        /* noop */
      }

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
        sessionStorage.clear();
      } catch {
        /* noop */
      }

      navigate("/login", { replace: true });
    } catch (err: any) {
      console.error("Logout failed:", err);
      toast.error("Não foi possível sair. Tente novamente.");
      setLoggingOut(false);
      onOpenChange(false);
    }
  };

  return (
    <>
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          // Prevent dismiss (outside click / escape) while processing
          if (loggingOut) return;
          onOpenChange(next);
        }}
      >
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-black/40" />
          <AlertDialogContent
            onOpenAutoFocus={(e) => e.preventDefault()}
            className={cn(
              "gohub-client fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-32px)] max-w-[340px] -translate-x-1/2 -translate-y-1/2 gap-0 rounded-[8px] border border-[#DDE3EE] bg-white p-6 text-[#172033] shadow-xl",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            )}
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#DC2626]/10">
                <LogOut className="h-5 w-5 text-[#DC2626]" />
              </div>
              <h2 className="text-base font-semibold text-[#172033]">
                Sair da conta?
              </h2>
              <p className="mt-1.5 text-sm text-[#64748B]">
                Você precisará entrar novamente para acessar seus agendamentos.
              </p>
            </div>

            <div className="mt-5 flex w-full flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => onOpenChange(false)}
                className="h-11 flex-1 rounded-[8px] border border-[#DDE3EE] bg-white text-sm font-medium text-[#172033] transition-colors hover:bg-[#F6F7FB] active:bg-[#EEF1F7] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleConfirm}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[8px] bg-[#DC2626] text-sm font-semibold text-white transition-colors hover:bg-[#bf1f1f] active:bg-[#a31a1a] disabled:opacity-80"
              >
                {loggingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saindo...
                  </>
                ) : (
                  "Sair"
                )}
              </button>
            </div>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>

      {loggingOut && (
        <div className="fixed inset-0 z-[100]">
          <LoadingScreen />
        </div>
      )}
    </>
  );
}