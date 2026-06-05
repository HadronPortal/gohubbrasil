import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Checks if a barbershop is blocked by payment.
 * If blocked, redirects the user appropriately.
 */
export const checkBarbershopAccess = async (barbershopId: string, role: string, navigate: any, clearBarbershop?: () => void) => {
  if (!barbershopId) return false;

  try {
    // 1. Refresh status
    await supabase.rpc('refresh_barbershop_payment_status', { p_barbershop_id: barbershopId });
    
    // 2. Check if blocked
    const { data: isBlocked, error } = await supabase.rpc('barbershop_is_payment_blocked', { p_barbershop_id: barbershopId });

    if (error) {
      console.error("Error checking payment block:", error);
      return false;
    }

    if (isBlocked) {
      if (role === 'owner' || role === 'admin' || role === 'barber') {
        // We'll handle this in the component by showing a blocked state
        return true; 
      } else if (role === 'client') {
        toast.error("Barbearia bloqueada por pagamento. Por favor, escolha outro estabelecimento.");
        if (clearBarbershop) {
          await clearBarbershop();
        }
        navigate("/", { replace: true });
        return true;
      }
    }
    
    return false;
  } catch (err) {
    console.error("Unexpected error in checkBarbershopAccess:", err);
    return false;
  }
};
