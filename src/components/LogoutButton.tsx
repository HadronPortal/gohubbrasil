import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  className?: string;
  showText?: boolean;
}

export function LogoutButton({ className, showText = false }: LogoutButtonProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    // 1. Sign out from Supabase
    await supabase.auth.signOut();
    
    // 2. Clear application-specific local storage
    // Profile is cleared by AuthContext onAuthStateChange
    // We clear these to satisfy "limpar estados locais relacionados ao usuário"
    // and ensuring "barbershop atual" is cleared if the user wants it to be session-based
    // Note: The previous requirement for ClientHome mentioned keeping it, 
    // but the new requirement explicitly says to clear "selectedBarbershop" and "barbershop atual" on logout.
    
    // Get keys to remove
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('selectedBarbershop') || 
        key.includes('appointment') || 
        key.includes('role')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // 3. Redirect to auth page with replace to prevent back navigation
    navigate("/login", { replace: true });
  };

  return (
    <Button 
      variant="ghost" 
      size={showText ? "default" : "icon"} 
      onClick={handleLogout} 
      className={cn(
        "text-[#8a9ab5] hover:text-[#f0c040] flex items-center gap-2 font-oswald uppercase tracking-widest",
        className
      )}
    >
      <LogOut className="w-5 h-5" />
      {showText && <span className="text-xs">Sair</span>}
    </Button>
  );
}
