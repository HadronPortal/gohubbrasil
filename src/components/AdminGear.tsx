import React from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const AdminGear: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (profile?.role === 'owner' || profile?.role === 'admin') {
    return (
      <button 
        onClick={() => navigate('/admin')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
        aria-label="Painel Administrativo"
      >
        <Settings size={24} color="#f0c040" />
      </button>
    );
  }

  return null;
};
