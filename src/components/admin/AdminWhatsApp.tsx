import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { RefreshCw, Smartphone, CheckCircle2, AlertCircle, Loader2, Copy, Check, QrCode, Trash2 } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status =
  | 'disconnected'
  | 'qr_requested'
  | 'qr_ready'
  | 'pairing_requested'
  | 'pairing'
  | 'connected'
  | 'reset_requested'
  | 'error';

interface WhatsAppConnection {
  id?: string;
  barbershop_id?: string;
  status: Status;
  phone_number?: string | null;
  pairing_code?: string | null;
  code_expires_at?: string | null;
  qr_code?: string | null;
  qr_expires_at?: string | null;
  last_error?: string | null;
}

type Method = 'qr' | 'code';

const ACTIVE_STATUSES: Status[] = ['qr_requested', 'qr_ready', 'pairing_requested', 'pairing'];

function useCountdown(iso?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!iso) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [iso]);
  if (!iso) return null;
  const diff = Math.max(0, Math.floor((new Date(iso).getTime() - now) / 1000));
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return { seconds: diff, label: `${m}:${s.toString().padStart(2, '0')}` };
}

export default function AdminWhatsApp() {
  const { profile } = useAuth();
  const barbershopId: string | undefined = profile?.barbershop_id ?? undefined;
  const [connection, setConnection] = useState<WhatsAppConnection | null>(null);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [method, setMethod] = useState<Method>('qr');

  const fetchConnection = useCallback(async (silent = false) => {
    if (!barbershopId) { setIsLoading(false); return; }
    if (!silent) setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('whatsapp_connections')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .maybeSingle();
      if (error) {
        console.error("Error fetching WhatsApp connection:", error);
      } else {
        setConnection(data ?? { status: 'disconnected' });
        if (data?.phone_number && !phone) setPhone(data.phone_number);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barbershopId]);

  useEffect(() => { fetchConnection(); }, [fetchConnection]);

  // Poll every 2s while pending states
  useEffect(() => {
    if (!connection?.status || !ACTIVE_STATUSES.includes(connection.status)) return;
    const i = setInterval(() => fetchConnection(true), 2000);
    return () => clearInterval(i);
  }, [connection?.status, fetchConnection]);

  const upsertConnection = async (patch: Partial<WhatsAppConnection>) => {
    if (!barbershopId) {
      toast.error("Estabelecimento não identificado");
      return null;
    }
    const payload = { barbershop_id: barbershopId, ...patch };
    const { data, error } = await (supabase as any)
      .from('whatsapp_connections')
      .upsert(payload, { onConflict: 'barbershop_id' })
      .select()
      .single();
    if (error) {
      toast.error(error.message || "Erro ao salvar conexão");
      return null;
    }
    setConnection(data);
    return data;
  };

  const handleGenerateQr = async () => {
    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '') || null;
      const data = await upsertConnection({
        status: 'qr_requested',
        qr_code: null,
        qr_expires_at: null,
        pairing_code: null,
        code_expires_at: null,
        last_error: null,
        phone_number: cleanPhone,
      });
      if (data) toast.success("Solicitação enviada!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePairing = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      toast.error("Informe um telefone válido com DDD (ex: 16994089563)");
      return;
    }
    setIsSubmitting(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const data = await upsertConnection({
        status: 'pairing_requested',
        qr_code: null,
        qr_expires_at: null,
        pairing_code: null,
        code_expires_at: null,
        last_error: null,
        phone_number: cleanPhone,
      });
      if (data) toast.success("Solicitação enviada!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearConnection = async () => {
    setIsClearing(true);
    try {
      const data = await upsertConnection({
        status: 'reset_requested',
        qr_code: null,
        qr_expires_at: null,
        pairing_code: null,
        code_expires_at: null,
        last_error: null,
      });
      if (data) toast.success("Conexão limpa");
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

  const qrCountdown = useCountdown(connection?.qr_expires_at);
  const codeCountdown = useCountdown(connection?.code_expires_at);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3" style={{ fontFamily: "Poppins, sans-serif" }}>
        <Loader2 className="h-7 w-7 text-[#3157D5] animate-spin" />
        <p className="text-sm text-[#64748B]">Carregando conexão...</p>
      </div>
    );
  }

  const StatusBadge = ({ status }: { status: Status }) => {
    const map: Record<Status, { label: string; cls: string }> = {
      disconnected: { label: 'WhatsApp desconectado', cls: 'bg-[#F1F5F9] text-[#475569]' },
      qr_requested: { label: 'Gerando QR Code...', cls: 'bg-[#FEF3C7] text-[#92400E]' },
      qr_ready: { label: 'Escaneie o QR Code no WhatsApp', cls: 'bg-[#EAF0FF] text-[#3157D5]' },
      pairing_requested: { label: 'Gerando código...', cls: 'bg-[#FEF3C7] text-[#92400E]' },
      pairing: { label: 'Digite este código no WhatsApp', cls: 'bg-[#EAF0FF] text-[#3157D5]' },
      connected: { label: 'WhatsApp conectado', cls: 'bg-[#E7F7EE] text-[#15803D]' },
      reset_requested: { label: 'Limpando conexão...', cls: 'bg-[#F1F5F9] text-[#475569]' },
      error: { label: 'Falha ao conectar', cls: 'bg-[#FDECEC] text-[#B91C1C]' },
    };
    const item = map[status] ?? map.disconnected;
    return (
      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", item.cls)}>
        {item.label}
      </span>
    );
  };

  const renderContent = () => {
    const status: Status = (connection?.status as Status) ?? 'disconnected';

    if (status === 'connected') {
      return (
        <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-6 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-[#E7F7EE] p-3">
            <CheckCircle2 className="h-8 w-8 text-[#15803D]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#172033]">WhatsApp do estabelecimento conectado</h3>
            {connection?.phone_number && (
              <p className="text-sm font-medium text-[#64748B] mt-1">{connection.phone_number}</p>
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
            Limpar conexão
          </Button>
        </div>
      );
    }

    // QR flow states
    if (status === 'qr_requested' || status === 'qr_ready') {
      return (
        <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-6 flex flex-col items-center text-center gap-5">
          <div className="w-full flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033]">QR Code de conexão</h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-[#64748B] -mt-2">
            Abra o WhatsApp {'>'} Dispositivos conectados {'>'} Conectar dispositivo e escaneie o QR Code.
          </p>

          <div className="w-full max-w-[280px] rounded-[8px] border-2 border-dashed border-[#3157D5]/40 bg-[#F6F7FB] p-5 flex flex-col items-center justify-center min-h-[220px] gap-3">
            {status === 'qr_ready' && connection?.qr_code ? (
              <QRCodeSVG value={connection.qr_code} size={200} includeMargin={false} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[#64748B]">
                <Loader2 className="h-6 w-6 animate-spin text-[#3157D5]" />
                <span className="text-xs">Gerando QR Code...</span>
              </div>
            )}
          </div>

          {status === 'qr_ready' && qrCountdown && (
            qrCountdown.seconds > 0 ? (
              <p className="text-xs text-[#64748B]">Expira em <span className="font-semibold text-[#172033]">{qrCountdown.label}</span></p>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <p className="text-xs text-[#B91C1C]">QR Code expirado. Gere outro para continuar.</p>
                <Button size="sm" onClick={handleGenerateQr} disabled={isSubmitting} className="h-9 rounded-[8px] bg-[#3157D5] text-xs text-white hover:bg-[#274ac0]">
                  Gerar novo QR Code
                </Button>
              </div>
            )
          )}

          <Button variant="ghost" size="sm" onClick={handleClearConnection} disabled={isClearing} className="h-9 text-xs text-[#DC2626] hover:bg-[#FDECEC]">
            Cancelar e limpar conexão
          </Button>
        </div>
      );
    }

    // Pairing code flow states
    if (status === 'pairing_requested' || status === 'pairing') {
      return (
        <div className="rounded-[8px] border border-[#DDE3EE] bg-white p-6 flex flex-col items-center text-center gap-5">
          <div className="w-full flex items-center justify-between">
            <h3 className="text-base font-semibold text-[#172033]">Código de pareamento</h3>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-[#64748B] -mt-2">
            Abra o WhatsApp {'>'} Dispositivos conectados {'>'} Conectar com número de telefone, e digite o código abaixo.
          </p>

          <div className="w-full max-w-[280px] rounded-[8px] border-2 border-dashed border-[#3157D5]/40 bg-[#F6F7FB] p-5 flex flex-col items-center justify-center min-h-[160px] gap-3">
            {status === 'pairing' && connection?.pairing_code ? (
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

          {status === 'pairing' && codeCountdown && (
            codeCountdown.seconds > 0 ? (
              <p className="text-xs text-[#64748B]">Expira em <span className="font-semibold text-[#172033]">{codeCountdown.label}</span></p>
            ) : (
              <p className="text-xs text-[#B91C1C]">Código expirado. Gere outro para continuar.</p>
            )
          )}

          <Button variant="ghost" size="sm" onClick={handleClearConnection} disabled={isClearing} className="h-9 text-xs text-[#DC2626] hover:bg-[#FDECEC]">
            Cancelar e limpar conexão
          </Button>
        </div>
      );
    }

    const errored = status === 'error';
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
          <StatusBadge status={status} />
        </div>

        {errored && (
          <div className="rounded-[8px] border border-[#FDECEC] bg-[#FDECEC] p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[#B91C1C] leading-relaxed space-y-1">
              {connection?.last_error && <p>{connection.last_error}</p>}
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
            QR Code (recomendado)
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
            Código de pareamento
          </button>
        </div>
        {method === 'qr' && (
          <p className="text-[11px] text-[#64748B] -mt-3 text-center">
            Mais estável para WhatsApp Business no iPhone. Sem necessidade de telefone.
          </p>
        )}

        <div className="space-y-3">
          {method === 'code' && (
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
          )}

          {method === 'qr' ? (
            <Button
              onClick={handleGenerateQr}
              disabled={isSubmitting}
              className="w-full h-12 rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0] disabled:opacity-60"
            >
              {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>) : "Gerar QR Code"}
            </Button>
          ) : (
            <Button
              onClick={handleGeneratePairing}
              disabled={isSubmitting || !phone || phone.length < 10}
              className="w-full h-12 rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0] disabled:opacity-60"
            >
              {isSubmitting ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Gerando...</>) : "Usar código de pareamento"}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleClearConnection}
            disabled={isClearing}
            className="w-full h-11 gap-2 rounded-[8px] border-[#DC2626]/30 text-xs text-[#DC2626] hover:bg-[#FDECEC]"
          >
            {isClearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Limpar conexão
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
        <Button variant="ghost" size="sm" onClick={() => fetchConnection()} className="h-9 text-xs text-[#64748B] hover:text-[#172033] hover:bg-[#F6F7FB]">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Atualizar
        </Button>
      </div>
      {renderContent()}
    </div>
  );
}