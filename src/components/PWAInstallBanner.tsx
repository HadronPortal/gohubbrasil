import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { isIOS, isStandalone } from "@/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "gohub_install_dismissed_at";
const DISMISS_DAYS = 7;

function wasRecentlyDismissed(): boolean {
  try {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const ts = Number(v);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function PWAInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (wasRecentlyDismissed()) return;

    if (ios) {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installed = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("appinstalled", installed);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, [ios]);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
    setVisible(false);
  };

  const install = async () => {
    if (ios) { setShowIosHelp(true); return; }
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* noop */
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  if (!visible) return (
    <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Como instalar o GoHub no iPhone</DialogTitle>
          <DialogDescription className="sr-only">Instruções para adicionar o GoHub à tela de início.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-2"><span className="font-bold text-[#119CFF]">1.</span> Toque no botão <Share className="inline w-4 h-4 mx-1" /> <b>Compartilhar</b> do Safari.</li>
          <li className="flex gap-2"><span className="font-bold text-[#119CFF]">2.</span> Escolha <Plus className="inline w-4 h-4 mx-1" /> <b>Adicionar à Tela de Início</b>.</li>
          <li className="flex gap-2"><span className="font-bold text-[#119CFF]">3.</span> Abra o GoHub pelo novo ícone na sua tela.</li>
        </ol>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <div className="mx-4 mt-3 rounded-2xl border border-[#119CFF]/20 bg-white shadow-sm p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#119CFF]/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-[#119CFF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] leading-snug text-slate-700">
            Instale o <b>GoHub</b> para acessar mais rápido e receber avisos dos seus agendamentos.
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 px-3 py-2 rounded-xl bg-[#119CFF] text-white text-[13px] font-semibold active:scale-95 transition"
        >
          {ios ? "Como instalar" : "Instalar"}
        </button>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <Dialog open={showIosHelp} onOpenChange={setShowIosHelp}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Como instalar o GoHub no iPhone</DialogTitle>
            <DialogDescription className="sr-only">Instruções para adicionar o GoHub à tela de início.</DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2"><span className="font-bold text-[#119CFF]">1.</span> Toque no botão <Share className="inline w-4 h-4 mx-1" /> <b>Compartilhar</b> do Safari.</li>
            <li className="flex gap-2"><span className="font-bold text-[#119CFF]">2.</span> Escolha <Plus className="inline w-4 h-4 mx-1" /> <b>Adicionar à Tela de Início</b>.</li>
            <li className="flex gap-2"><span className="font-bold text-[#119CFF]">3.</span> Abra o GoHub pelo novo ícone na sua tela.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}