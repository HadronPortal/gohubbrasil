import React from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const AdminGear: React.FC = () => {
  const auth = useAuth();
  const profile = auth?.profile;
  const navigate = useNavigate();

  console.log('AdminGear check - profile completo:', profile);
  console.log('role atual:', profile?.role);
  console.log('é owner?', profile?.role === 'owner');

  if (profile?.role === 'owner') {
    return (
      <button 
        onClick={() => navigate('/admin')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
      >
        <Settings size={24} color="#f0c040" />
      </button>
    );
  }

  return null;
};


