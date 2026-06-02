import React from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AdminGear: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile?.isAdmin && !profile?.isSuperAdmin) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className="p-2 bg-[#141b2a] border border-[#2a3347] rounded-full hover:border-[#f0c040] transition-all group"
          aria-label="Opções Administrativas"
        >
          <Settings size={20} className="text-[#8a9ab5] group-hover:text-[#f0c040]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] w-56">
        <DropdownMenuLabel className="text-[#f0c040] font-oswald uppercase tracking-wider">
          Administração
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-[#2a3347]" />
        
        {profile.isAdmin && (
          <DropdownMenuItem 
            onClick={() => navigate('/admin')}
            className="focus:bg-[#1c2333] focus:text-[#f0c040] cursor-pointer gap-2"
          >
            <Settings size={16} />
            <span>Gerenciar Barbearia</span>
          </DropdownMenuItem>
        )}

        {profile.isSuperAdmin && (
          <DropdownMenuItem 
            onClick={() => navigate('/super-admin')}
            className="focus:bg-[#1c2333] focus:text-[#f0c040] cursor-pointer gap-2"
          >
            <Shield size={16} />
            <span>Cadastrar Barbearia</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
