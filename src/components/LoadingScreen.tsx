import { Scissors } from "lucide-react";

export const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-[#1c2333] flex flex-col items-center justify-center gap-6 text-[#c8d4e8]">
      <div className="relative">
        {/* Usando a imagem local da tesoura com animação */}
        <div className="animate-bounce">
          <img 
            src="/tesouras.png" 
            alt="Carregando..." 
            className="w-16 h-16 object-contain"
            style={{ 
              filter: "invert(81%) sepia(35%) saturate(847%) hue-rotate(352deg) brightness(101%) contrast(89%)",
              animation: "scissors-cut 1.5s ease-in-out infinite"
            }}
          />
        </div>
      </div>
      <div className="font-oswald tracking-[0.3em] text-sm font-bold text-[#f0c040] animate-pulse uppercase">
        Carregando...
      </div>
      
      <style>{`
        @keyframes scissors-cut {
          0%, 100% { transform: rotate(-10deg) scale(1); }
          50% { transform: rotate(10deg) scale(1.1); }
        }
      `}</style>
    </div>
  );
};
