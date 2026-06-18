import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserAvatar } from "@/components/UserAvatar";

export function ClientFlowLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="gohub-client min-h-screen bg-[#F6F7FB] pb-28 text-[#172033]">
      <div className="mx-auto max-w-md">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 pb-4 backdrop-blur-xl" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 active:scale-95" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-extrabold leading-tight">{title}</h1>
              {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
        </header>
        <main className="px-4 py-6">{children}</main>
      </div>
      {footer && (
        <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 backdrop-blur-xl" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <div className="mx-auto max-w-md">{footer}</div>
        </footer>
      )}
    </div>
  );
}

export function FlowAvatar({ name, avatarUrl }: { name?: string | null; avatarUrl?: string | null }) {
  return <UserAvatar name={name} avatarUrl={avatarUrl} size="md" className="border border-slate-200 bg-white text-[#3157D5]" />;
}
