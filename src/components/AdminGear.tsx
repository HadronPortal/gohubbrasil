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
  const triggerClass =
    "p-2 bg-white border border-[#DDE3EE] rounded-full hover:border-[#3157D5] transition-all group";
  const iconClass = "text-[#64748B] group-hover:text-[#3157D5]";

  if (isBarber && !isSuperAdmin) {
    return (
      <button
        onClick={() => navigate('/barber-dashboard')}
        className={triggerClass}
        aria-label="Painel Profissional"
      >
        <Settings size={20} className={iconClass} />
      </button>
    );
  }

  if (isAdmin && !isSuperAdmin) {
    return (
      <button
        onClick={() => navigate('/admin')}
        className={triggerClass}
        aria-label="Painel Administrativo"
      >
        <Settings size={20} className={iconClass} />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={triggerClass}
        aria-label="Opções Administrativas"
      >
        <Settings size={20} className={iconClass} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-52 bg-white border border-[#DDE3EE] rounded-[8px] shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {isAdmin && (
              <button
                onClick={() => {
                  navigate('/admin');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#172033] hover:bg-[#EAF0FF] hover:text-[#3157D5] flex items-center gap-2"
              >
                <Settings size={14} />
                Gerenciar Estabelecimento
              </button>
            )}
            {isSuperAdmin && (
              <button
                onClick={() => {
                  navigate('/super-admin');
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-[#172033] hover:bg-[#EAF0FF] hover:text-[#3157D5] flex items-center gap-2 border-t border-[#DDE3EE]"
              >
                <PlusCircle size={14} />
                Cadastrar Estabelecimento
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
