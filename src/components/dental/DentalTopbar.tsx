import { Bell, MessageSquare, Settings, User, ChevronRight } from "lucide-react";

export function DentalTopbar() {
  return (
    <header className="sticky top-0 z-30">
      <div className="bg-purple-600 text-white text-sm py-2 px-6 text-center">
        Seu teste do Plano Pro acaba em <strong>7 dias</strong>
        <button className="ml-3 bg-white/20 hover:bg-white/30 px-3 py-0.5 rounded text-xs font-medium">
          Assinar agora
        </button>
      </div>
      <div className="bg-blue-600 text-white">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg">GoHub Dental</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
            <span className="text-sm opacity-90">Agenda</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/10 rounded-full"><Bell className="h-5 w-5" /></button>
            <button className="p-2 hover:bg-white/10 rounded-full"><MessageSquare className="h-5 w-5" /></button>
            <button className="p-2 hover:bg-white/10 rounded-full"><Settings className="h-5 w-5" /></button>
            <button className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
              <User className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}