import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, RefreshCw, Smartphone, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppConnection {
  status: 'disconnected' | 'pairing_requested' | 'pairing' | 'connected' | 'error';
  pairing_code?: string;
  last_error?: string;
  phone?: string;
}

export default function AdminWhatsApp() {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchConnection = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_whatsapp_connection');
      
      if (error) {
        console.error("Error fetching WhatsApp connection:", error);
        return;
      }

      if (data) {
        setConnection(data as WhatsAppConnection);
      } else {
        setConnection({ status: 'disconnected' });
      }
    } catch (err) {
      console.error("Fatal error fetching WhatsApp connection:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Polling effect when pairing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (connection?.status === 'pairing' || connection?.status === 'pairing_requested') {
      interval = setInterval(() => {
        fetchConnection(true);
      }, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [connection?.status, fetchConnection]);

  const handleRequestPairing = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Informe um telefone válido com DDD (ex: 16994089563)");
      return;
    }

    setIsGenerating(true);
    try {
      // Remove any non-numeric characters just in case, though user should type numbers
      const cleanPhone = phone.replace(/\D/g, '');
      
      const { data, error } = await supabase.rpc('request_my_whatsapp_pairing', {
        p_phone: cleanPhone
      });

      if (error) {
        toast.error(error.message || "Erro ao gerar código de pareamento");
        return;
      }

      toast.success("Solicitação enviada! Aguarde o código.");
      fetchConnection();
    } catch (err) {
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 text-[#f0c040] animate-spin" />
        <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">Carregando conexão...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (connection?.status === 'connected') {
      return (
        <div className="bg-[#141b2a] border border-green-500/30 p-8 rounded-[4px] flex flex-col items-center text-center space-y-4 animate-in zoom-in duration-300">
          <div className="bg-green-500/10 p-4 rounded-full">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-green-500 font-oswald tracking-widest uppercase">WhatsApp Conectado</h3>
            <p className="text-sm text-[#8a9ab5] mt-2">Sua barbearia já está enviando notificações automáticas.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => fetchConnection()}
            className="mt-4 border-[#2a3347] text-[#8a9ab5] hover:text-[#f0c040] hover:border-[#f0c040]"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar Status
          </Button>
        </div>
      );
    }

    if (connection?.status === 'pairing' || connection?.status === 'pairing_requested') {
      return (
        <div className="bg-[#141b2a] border border-[#f0c040]/30 p-8 rounded-[4px] flex flex-col items-center text-center space-y-6 animate-in fade-in duration-500">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-[#f0c040] font-oswald tracking-widest uppercase">Código de Pareamento</h3>
            <p className="text-sm text-[#8a9ab5]">Abra o WhatsApp no seu celular {'>'} Aparelhos conectados {'>'} Conectar um aparelho {'>'} Conectar com número de telefone.</p>
          </div>

          <div className="bg-[#1c2333] border-2 border-dashed border-[#f0c040] p-6 rounded-[4px] w-full max-w-[280px]">
            {connection.pairing_code ? (
              <span className="text-4xl font-bold text-[#f0c040] font-oswald tracking-[0.2em]">
                {connection.pairing_code}
              </span>
            ) : (
              <div className="flex items-center justify-center gap-2 text-[#8a9ab5]">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs uppercase tracking-widest font-bold">Gerando...</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-blue-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Aguardando conexão no celular...</span>
            </div>
            <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">Não feche esta tela até concluir</p>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setConnection({ status: 'disconnected' })}
            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 text-[10px] font-bold uppercase tracking-widest"
          >
            Cancelar e tentar outro número
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-[#141b2a] border border-[#2a3347] p-6 rounded-[4px] space-y-6 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4">
          <div className="bg-[#f0c040]/10 p-3 rounded-[4px]">
            <MessageSquare className="w-6 h-6 text-[#f0c040]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#f0c040] font-oswald tracking-widest uppercase">Configurar WhatsApp</h3>
            <p className="text-[10px] text-[#8a9ab5] uppercase tracking-widest">Conecte seu número para enviar avisos</p>
          </div>
        </div>

        {connection?.status === 'error' && connection.last_error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-[4px] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-400 leading-relaxed font-medium">
              Erro na última tentativa: {connection.last_error}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[#8a9ab5] uppercase tracking-widest ml-1">
              Telefone (com DDD)
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a9ab5]" />
              <Input
                placeholder="Ex: 16994089563"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="bg-[#1c2333] border-[#2a3347] pl-10 h-12 text-[#c8d4e8] focus:border-[#f0c040] transition-colors font-medium placeholder:text-[#3d4b66]"
                maxLength={11}
              />
            </div>
          </div>

          <Button
            onClick={handleRequestPairing}
            disabled={isGenerating || !phone || phone.length < 10}
            className="w-full bg-[#f0c040] hover:bg-[#d9ac36] text-[#1c2333] font-bold font-oswald tracking-widest h-12 disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                GERANDO...
              </>
            ) : (
              "GERAR CÓDIGO DE PAREAMENTO"
            )}
          </Button>

          <p className="text-[10px] text-[#8a9ab5] text-center leading-relaxed uppercase tracking-wider px-4">
            Ao conectar, sua barbearia enviará mensagens automáticas de confirmação e lembretes para os clientes.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#f0c040] font-oswald tracking-widest uppercase flex items-center gap-3">
          <div className="w-2 h-8 bg-[#f0c040]" />
          WhatsApp
        </h2>
        {connection?.status === 'error' && (
           <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fetchConnection()}
            className="text-[#8a9ab5] hover:text-[#f0c040] text-[10px] font-bold uppercase tracking-widest"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Tentar novamente
          </Button>
        )}
      </div>

      {renderContent()}
    </div>
  );
}
