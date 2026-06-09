import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface AuthErrorScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export const AuthErrorScreen = ({ error, onRetry }: AuthErrorScreenProps) => {
  return (
    <div className="min-h-screen bg-[#1c2333] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
        <AlertTriangle className="w-10 h-10 text-red-500" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-xl font-bold font-oswald uppercase text-[#f0c040] tracking-widest">
          Erro ao inicializar
        </h2>
        <p className="text-[#8a9ab5] text-sm uppercase tracking-wider max-w-xs mx-auto">
          {error || "Ocorreu um erro inesperado ao carregar seu perfil."}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3 pt-4">
        <Button 
          onClick={() => window.location.reload()}
          className="w-full bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-bold h-12 rounded-none font-oswald tracking-[2px]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          TENTAR NOVAMENTE
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = "/login";
          }}
          className="w-full bg-[#141b2a] border-[#2a3347] text-[#8a9ab5] hover:text-white h-12 rounded-none font-oswald tracking-[2px]"
        >
          IR PARA LOGIN
        </Button>
      </div>
    </div>
  );
};