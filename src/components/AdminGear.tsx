import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export const AdminGear: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => navigate("/admin")}
      className="text-[#f0c040] hover:bg-[#f0c040]/10"
      title="Painel Admin"
    >
      <Settings className="w-5 h-5" />
    </Button>
  );
};
