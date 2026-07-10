import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Smartphone, CheckCircle2, AlertCircle, Loader2, Copy, Check, QrCode, Trash2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WhatsAppConnection {
  status: 'disconnected' | 'pairing_requested' | 'pairing' | 'connected' | 'error';
  pairing_code?: string;
  qr_code?: string;
  qr_code_image?: string;
  last_error?: string;
  phone?: string;
  connected_at?: string;
  code_expires_at?: string;
}

const CONNECT_TIMEOUT_MS = 90_000;
type ConnectMethod = 'qr' | 'code';

export default function AdminWhatsApp() {
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<ConnectMethod>('qr');
  const [pairingStartedAt, setPairingStartedAt] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const fetchConnection = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_my_whatsapp_connection');
      if (error) {
        console.error("Error fetching WhatsApp connection:", error);
        return;
      }
      const connectionData = (data as any)?.connection;
      setConnection(connectionData ?? { status: 'disconnected' });
    } catch (err) {
      console.error("Fatal error fetching WhatsApp connection:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Polling while pairing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!timedOut && (connection?.status === 'pairing' || connection?.status === 'pairing_requested')) {
      interval = setInterval(() => fetchConnection(true), 2000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [connection?.status, fetchConnection, timedOut]);

  // 90s timeout guard
  useEffect(() => {
    if (!pairingStartedAt) return;
    if (connection?.status === 'connected') {
      setPairingStartedAt(null);
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      if (connection?.status === 'pairing' || connection?.status === 'pairing_requested') {
        setTimedOut(true);
      }
    }, CONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [pairingStartedAt, connection?.status]);

  const handleRequestPairing = async () => {
    if (!phone || phone.length < 10) {
      toast.error("Informe um telefone válido com DDD (ex: 16994089563)");
      return;
    }
    setIsGenerating(true);
    setTimedOut(false);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { error } = await supabase.rpc('request_my_whatsapp_pairing', {
        p_phone: cleanPhone,
        p_method: method,
      } as any);
      if (error) {
        toast.error(error.message || "Erro ao gerar conexão");
        return;
      }
      const { data: connectionResult } = await supabase.rpc('get_my_whatsapp_connection');
      const connectionData = (connectionResult as any)?.connection;
      if (connectionData) setConnection(connectionData);
      setPairingStartedAt(Date.now());
      toast.success("Solicitação enviada!");
    } catch (err) {
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearConnection = async () => {
    setIsClearing(true);
    try {
      const { error } = await supabase.rpc('clear_my_whatsapp_connection' as any);
      if (error) console.warn("clear_my_whatsapp_connection indisponível:", error.message);
      setConnection({ status: 'disconnected' });
      setPairingStartedAt(null);
      setTimedOut(false);
      toast.success("Conexão anterior limpa");
    } catch (err) {
      toast.error("Erro ao limpar conexão");
    } finally {
      setIsClearing(false);
    }
  };

  const handleCopyCode = async () => {
    if (!connection?.pairing_code) return;
    try {
      await navigator.clipboard.writeText(connection.pairing_code);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Erro ao copiar código");
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

  const StatusBadge = ({ status }: { status: WhatsAppConnection['status'] | 'timeout' }) => {
    const map: Record<string, { label: string; cls: string }> = {
      disconnected: { label: 'Desconectado', cls: 'bg-[#F1F5F9] text-[#475569]' },
      pairing_requested: { label: 'Aguardando conexão', cls: 'bg-[#FEF3C7] text-[#92400E]' },
      pairing: { label: 'Conectando', cls: 'bg-[#EAF0FF] text-[#3157D5]' },
      connected: { label: 'Conectado', cls: 'bg-[#E7F7EE] text-[#15803D]' },
      error: { label: 'Falha ao conectar', cls: 'bg-[#FDECEC] text-[#B91C1C]' },
      timeout: { label: 'Precisa reconectar', cls: 'bg-[#FDECEC] text-[#B91C1C]' },
    };
    const item = map[status] ?? map.disconnected;
    return (
      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", item.cls)}>
        {item.label}
      </span>
    );
  };

  const renderContent = () => {
    if (connection?.status === 'connected') {
      return (
        <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-6 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-[#E7F7EE] p-3">
            <CheckCircle2 className="h-8 w-8 text-[#15803D]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#172033]">WhatsApp do estabelecimento conectado</h3>
            {connection.phone && (
              <p className="text-sm font-medium text-[#64748B] mt-1">{connection.phone}</p>
            )}
            <p className="text-xs text-[#64748B] mt-2">O WhatsApp do estabelecimento já está enviando notificações automáticas.</p>
          </div>
          <Button
            variant="outline"
            onClick={handleClearConnection}
            disabled={isClearing}
            className="h-10 gap-2 rounded-[8px] border-[#DC2626]/30 text-sm text-[#DC2626] hover:bg-[#FDECEC]"
          >
            {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Limpar conexão anterior
          </Button>
        </div>
      );
    }

    if ((connection?.status === 'pairing' || connection?.status === 'pairing_requested') && !timedOut) {
      const qr = connection.qr_code_image || connection.qr_code;
      const showQr = method === 'qr' && !!qr;
      const showCode = method === 'code' && connection.status === 'pairing' && connection.pairing_code;

      return (
        <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-6 flex flex-col items-center text-center gap-5">
          <div className="w-full flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033]">
              {method === 'qr' ? 'QR Code de conexão' : 'Código de pareamento'}
            </h3>
            <StatusBadge status={connection.status} />
          </div>
          <p className="text-sm text-[#64748B] -mt-2">
            {method === 'qr'
              ? 'Abra o WhatsApp > Aparelhos conectados > Conectar um aparelho e escaneie o QR Code abaixo.'
              : 'Abra o WhatsApp > Aparelhos conectados > Conectar com número de telefone, e digite o código abaixo.'}
          </p>

          <div className="w-full max-w-[280px] rounded-[8px] border-2 border-dashed border-[#3157D5]/40 bg-[#F6F7FB] p-5 flex flex-col items-center justify-center min-h-[220px] gap-3">
            {showQr ? (
              <img
                src={qr!.startsWith('data:') || qr!.startsWith('http') ? qr! : `data:image/png;base64,${qr}`}
                alt="QR Code do WhatsApp"
                className="h-[200px] w-[200px] object-contain"
              />
            ) : showCode ? (
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
                <span className="text-xs">{method === 'qr' ? 'Gerando QR Code...' : 'Gerando código...'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 text-[#3157D5]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs font-medium">Aguardando conexão no celular...</span>
            </div>
            <p className="text-xs text-[#64748B]">Não feche esta tela até concluir (até 90s)</p>
          </div>

          <Button variant="ghost" size="sm" onClick={handleClearConnection} className="h-9 text-xs text-[#DC2626] hover:bg-[#FDECEC]">
            Cancelar e tentar novamente
          </Button>
        </div>
      );
    }

    const errored = connection?.status === 'error' || timedOut;
    return (
      <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <WhatsAppIcon size={40} />
            <div>
              <h3 className="text-base font-semibold text-[#172033]">WhatsApp do estabelecimento</h3>
              <p className="text-xs text-[#64748B]">Conecte seu número para enviar avisos.</p>
            </div>
          </div>
          <StatusBadge status={timedOut ? 'timeout' : (connection?.status ?? 'disconnected')} />
        </div>

        {errored && (
          <div className="rounded-[8px] border border-[#FDECEC] bg-[#FDECEC] p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[#B91C1C] leading-relaxed space-y-1">
              {connection?.last_error && <p>Erro na última tentativa: {connection.last_error}</p>}
              {timedOut && <p>Tempo esgotado (90s) sem conectar.</p>}
              <p className="font-medium">Remova dispositivos antigos no WhatsApp e tente conectar por QR Code.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-[8px] border border-[#DDE3EE] bg-[#F6F7FB] p-1">
          <button
            type="button"
            onClick={() => setMethod('qr')}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-[6px] text-xs font-semibold transition-colors",
              method === 'qr' ? "bg-[#3157D5] text-white" : "text-[#64748B] hover:text-[#172033]"
            )}
          >
            <QrCode className="h-4 w-4" />
            Conectar por QR Code
          </button>
          <button
            type="button"
            onClick={() => setMethod('code')}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-[6px] text-xs font-semibold transition-colors",
              method === 'code' ? "bg-[#3157D5] text-white" : "text-[#64748B] hover:text-[#172033]"
            )}
          >
            <Smartphone className="h-4 w-4" />
            Conectar por código
          </button>
        </div>
        {method === 'qr' && (
          <p className="text-[11px] text-[#64748B] -mt-3 text-center">
            Recomendado — mais estável para WhatsApp Business no iPhone.
          </p>
        )}

        <Button
          variant="outline"
          onClick={handleClearConnection}
          disabled={isClearing}
          className="w-full h-10 gap-2 rounded-[8px] border-[#DC2626]/30 text-xs text-[#DC2626] hover:bg-[#FDECEC]"
        >
          {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Limpar conexão anterior
        </Button>

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
            {isGenerating
              ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>)
              : method === 'qr' ? "Gerar QR Code" : "Gerar código de pareamento"}
          </Button>

          <p className="text-xs text-[#64748B] text-center leading-relaxed px-4">
            Ao conectar, o WhatsApp do estabelecimento enviará mensagens automáticas de confirmação e lembretes para os clientes.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4" style={{ fontFamily: "Poppins, sans-serif" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#172033]">WhatsApp do estabelecimento</h2>
        {(connection?.status === 'error' || timedOut) && (
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