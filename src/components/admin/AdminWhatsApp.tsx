import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, RefreshCw, Smartphone, CheckCircle2, AlertCircle, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppConnection {
  status: 'disconnected' | 'pairing_requested' | 'pairing' | 'connected' | 'error';
  pairing_code?: string;
  last_error?: string;
  phone?: string;
  connected_at?: string;
  code_expires_at?: string;
}

export default function AdminWhatsApp() {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchConnection = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_whatsapp_connection');
      
      if (error) {
        console.error("Error fetching WhatsApp connection:", error);
        return;
      }

      // RPC returns { connection: { status, pairing_code, ... } }
      const connectionData = (data as any)?.connection;
      if (connectionData) {
        setConnection(connectionData);
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
      }, 2000);
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
      
      const { error } = await supabase.rpc('request_my_whatsapp_pairing', {
        p_phone: cleanPhone
      });

      if (error) {
        toast.error(error.message || "Erro ao gerar código de pareamento");
        return;
      }

      // Immediately fetch status after requesting
      const { data: connectionResult } = await supabase.rpc('get_my_whatsapp_connection');
      const connectionData = (connectionResult as any)?.connection;
      if (connectionData) {
        setConnection(connectionData);
      }

      toast.success("Solicitação enviada!");
    } catch (err) {
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (connection?.pairing_code) {
      try {
        await navigator.clipboard.writeText(connection.pairing_code);
        setCopied(true);
        toast.success("Código copiado!");
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        toast.error("Erro ao copiar código");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3" style={{ fontFamily: "Poppins, sans-serif" }}>
        <Loader2 className="h-7 w-7 text-[#3157D5] animate-spin" />
        <p className="text-sm text-[#64748B]">Carregando conexão...</p>
      </div>
    );
  }

  const renderContent = () => {
    if (connection?.status === 'connected') {
      return (
        <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-6 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-[#E7F7EE] p-3">
            <CheckCircle2 className="h-8 w-8 text-[#15803D]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#172033]">WhatsApp conectado</h3>
            {connection.phone && (
              <p className="text-sm font-medium text-[#64748B] mt-1">{connection.phone}</p>
            )}
            <p className="text-xs text-[#64748B] mt-2">Seu estabelecimento já está enviando notificações automáticas.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setConnection({ status: 'disconnected' })}
            className="h-10 rounded-[8px] border-[#DC2626]/30 text-sm text-[#DC2626] hover:bg-[#FDECEC]"
          >
            Desconectar e trocar número
          </Button>
        </div>
      );
    }

    if (connection?.status === 'pairing' || connection?.status === 'pairing_requested') {
      const showCode = connection.status === 'pairing' && connection.pairing_code;

      return (
        <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-6 flex flex-col items-center text-center gap-5">
          <div>
            <h3 className="text-base font-semibold text-[#172033]">Código de pareamento</h3>
            <p className="text-sm text-[#64748B] mt-1">Abra o WhatsApp {'>'} Aparelhos conectados {'>'} Conectar com número de telefone, e digite o código abaixo.</p>
          </div>

          <div className="w-full max-w-[280px] rounded-[8px] border-2 border-dashed border-[#3157D5]/40 bg-[#F6F7FB] p-5 flex flex-col items-center justify-center min-h-[120px] gap-3">
            {showCode ? (
              <>
                <span className="text-4xl font-semibold text-[#3157D5] tracking-[0.2em]">
                  {connection.pairing_code}
                </span>
                <Button variant="outline" size="sm" onClick={handleCopyCode} className="h-9 gap-2 rounded-[8px] border-[#DDE3EE] text-xs text-[#3157D5] hover:bg-[#EAF0FF]">
                  {copied ? <><Check className="h-3.5 w-3.5" />Código copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar código</>}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#64748B]">
                <Loader2 className="h-6 w-6 animate-spin text-[#3157D5]" />
                <span className="text-xs">Gerando código...</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 text-[#3157D5]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-medium">Aguardando conexão no celular...</span>
            </div>
            <p className="text-xs text-[#64748B]">Não feche esta tela até concluir</p>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setConnection({ status: 'disconnected' })} className="h-9 text-xs text-[#DC2626] hover:bg-[#FDECEC]">
            Cancelar e tentar outro número
          </Button>
        </div>
      );
    }

    // Default: disconnected or error
    return (
      <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-5 space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-[8px] bg-[#EAF0FF] p-2.5">
            <MessageSquare className="h-5 w-5 text-[#3157D5]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#172033]">Configurar WhatsApp</h3>
            <p className="text-xs text-[#64748B]">Conecte seu número para enviar avisos.</p>
          </div>
        </div>

        {connection?.status === 'error' && connection.last_error && (
          <div className="rounded-[8px] border border-[#FDECEC] bg-[#FDECEC] p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#B91C1C] leading-relaxed">
              Erro na última tentativa: {connection.last_error}
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#172033]">Telefone (com DDD)</label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
              <Input
                placeholder="Ex: 16994089563"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="h-11 pl-10 rounded-[8px] border-[#DDE3EE]"
                maxLength={11}
              />
            </div>
          </div>

          <Button
            onClick={handleRequestPairing}
            disabled={isGenerating || !phone || phone.length < 10}
            className="w-full h-12 rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0] disabled:opacity-60"
          >
            {isGenerating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>) : "Gerar código de pareamento"}
          </Button>

          <p className="text-xs text-[#64748B] text-center leading-relaxed px-4">
            Ao conectar, seu estabelecimento enviará mensagens automáticas de confirmação e lembretes para os clientes.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#172033]">WhatsApp</h2>
        {connection?.status === 'error' && (
          <Button variant="ghost" size="sm" onClick={() => fetchConnection()} className="h-9 text-xs text-[#64748B] hover:text-[#172033] hover:bg-[#F6F7FB]">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Tentar novamente
          </Button>
        )}
      </div>
      {renderContent()}
    </div>
  );
}
