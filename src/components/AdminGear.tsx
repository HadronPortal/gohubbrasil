import React from "react";
import { useNavigate } from "react-router-dom";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const AdminGear: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Condition exactly as requested by user
  if (profile?.role === 'owner') {
    return (
      <button onClick={() => navigate('/admin')} className="p-2">
        <Settings size={24} color="#f0c040" />
      </button>
    );
  }

  return null;
};
