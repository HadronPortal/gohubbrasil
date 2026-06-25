import { useEffect, useState } from "react";
import { Download, MoreVertical, Plus, Share, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isIOS, isStandalone } from "@/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const LEGACY_DISMISS_KEYS = [
  "gohub:pwa-install-dismissed",
  "gohub_install_dismissed",
  "pwa-install-dismissed",
  "gohub_install_dismissed_at",
];

function InstallHelpDialog({
  platform,
  open,
  onOpenChange,
}: {
  platform: "ios" | "android";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ios = platform === "ios";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl [&>button]:border [&>button]:border-slate-300 [&>button]:bg-white [&>button]:text-slate-500 [&>button]:outline-none [&>button]:ring-0 [&>button]:ring-offset-0 [&>button]:hover:border-[#3157D5] [&>button]:hover:text-[#3157D5] [&>button]:focus:border-[#3157D5] [&>button]:focus:outline-none [&>button]:focus:ring-0 [&>button]:focus-visible:border-[#3157D5] [&>button]:focus-visible:outline-none [&>button]:focus-visible:ring-0">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {ios ? "Como instalar o GoHub no iPhone" : "Como instalar o GoHub"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Instrucoes para adicionar o GoHub a tela inicial.
          </DialogDescription>
        </DialogHeader>
        {ios ? (
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className="font-bold text-[#119CFF]">1.</span>
              Toque no botao <Share className="mx-1 inline h-4 w-4" /> <b>Compartilhar</b> do Safari.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#119CFF]">2.</span>
              Escolha <Plus className="mx-1 inline h-4 w-4" /> <b>Adicionar a Tela de Inicio</b>.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#119CFF]">3.</span>
              Abra o GoHub pelo novo icone na sua tela.
            </li>
          </ol>
        ) : (
          <ol className="space-y-3 text-sm text-slate-700">
            <li className="flex gap-2">
              <span className="font-bold text-[#119CFF]">1.</span>
              Toque no menu <MoreVertical className="mx-1 inline h-4 w-4" /> do navegador.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#119CFF]">2.</span>
              Escolha <b>Instalar app</b> ou <b>Adicionar a tela inicial</b>.
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-[#119CFF]">3.</span>
              Confirme e abra o GoHub pelo icone criado.
            </li>
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PWAInstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showAndroidHelp, setShowAndroidHelp] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (isStandalone()) {
      try {
        LEGACY_DISMISS_KEYS.forEach((key) => localStorage.removeItem(key));
      } catch {
        /* noop */
      }
      return;
    }

    try {
      LEGACY_DISMISS_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch {
      /* noop */
    }

    if (ios) {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const installed = () => {
      try {
        LEGACY_DISMISS_KEYS.forEach((key) => localStorage.removeItem(key));
      } catch {
        /* noop */
      }
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);

    const fallbackTimer = window.setTimeout(() => {
      if (!isStandalone()) setVisible(true);
    }, 1200);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, [ios]);

  const dismiss = () => {
    setVisible(false);
  };

  const install = async () => {
    if (ios) {
      setShowIosHelp(true);
      return;
    }

    if (!deferred) {
      setShowAndroidHelp(true);
      return;
    }

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

  if (!visible) {
    return (
      <>
        <InstallHelpDialog platform="ios" open={showIosHelp} onOpenChange={setShowIosHelp} />
        <InstallHelpDialog platform="android" open={showAndroidHelp} onOpenChange={setShowAndroidHelp} />
      </>
    );
  }

  return (
    <>
      <div className="mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-[#119CFF]/20 bg-white p-3 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#119CFF]/10">
          <Download className="h-5 w-5 text-[#119CFF]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-snug text-slate-700">
            Instale o <b>GoHub</b> para acessar mais rapido e receber avisos dos seus agendamentos.
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-xl bg-[#119CFF] px-3 py-2 text-[13px] font-semibold text-white transition active:scale-95"
        >
          {ios || !deferred ? "Como instalar" : "Instalar"}
        </button>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <InstallHelpDialog platform="ios" open={showIosHelp} onOpenChange={setShowIosHelp} />
      <InstallHelpDialog platform="android" open={showAndroidHelp} onOpenChange={setShowAndroidHelp} />
    </>
  );
}
