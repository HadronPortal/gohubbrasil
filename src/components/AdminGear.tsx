import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, Shield, PlusCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const AdminGear: React.FC = () => {
  const { isAdmin, isSuperAdmin, isBarber } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (!isAdmin && !isSuperAdmin && !isBarber) {
    return null;
  }

  // Se for barbeiro, manda para o dashboard de barbeiro
  if (isBarber && !isSuperAdmin) {
    return (
      <button 
        onClick={() => navigate('/barber-dashboard')}
        className="p-2 bg-[#141b2a] border border-[#2a3347] rounded-full hover:border-[#f0c040] transition-all group"
        aria-label="Painel Barbeiro"
      >
        <Settings size={20} className="text-[#8a9ab5] group-hover:text-[#f0c040]" />
      </button>
    );
  }

  // Se for apenas admin/owner (não superadmin), redireciona direto
  if (isAdmin && !isSuperAdmin) {
    return (
      <button 
        onClick={() => navigate('/admin')}
        className="p-2 bg-[#141b2a] border border-[#2a3347] rounded-full hover:border-[#f0c040] transition-all group"
        aria-label="Painel Administrativo"
      >
        <Settings size={20} className="text-[#8a9ab5] group-hover:text-[#f0c040]" />
      </button>
    );
  }

  // Se for superadmin, mostra menu simples ou botões
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-[#141b2a] border border-[#2a3347] rounded-full hover:border-[#f0c040] transition-all group"
        aria-label="Opções Administrativas"
      >
        <Settings size={20} className="text-[#8a9ab5] group-hover:text-[#f0c040]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-48 bg-[#141b2a] border border-[#2a3347] rounded-md shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {isAdmin && (
              <button
                onClick={() => {
                  navigate('/admin');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#c8d4e8] hover:bg-[#1c2333] hover:text-[#f0c040] flex items-center gap-2"
              >
                <Settings size={14} />
                Gerenciar Barbearia
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => {
                  navigate('/super-admin');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#c8d4e8] hover:bg-[#1c2333] hover:text-[#f0c040] flex items-center gap-2 border-t border-[#2a3347]"
              >
                <PlusCircle size={14} />
                Cadastrar Barbearia
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Overlay para fechar ao clicar fora */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
