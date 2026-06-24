import { CalendarDays, Heart, Home, Search, UserRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const items = [
  { label: "Início", icon: Home, path: "/client-home" },
  { label: "Buscar", icon: Search, path: "/client-category/todos" },
  { label: "Agenda", icon: CalendarDays, path: "/client-agenda" },
  { label: "Favoritos", icon: Heart, path: "/client-home#favoritos" },
  { label: "Perfil", icon: UserRound, path: "/client-home#perfil" },
];

export function ClientBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const open = (path: string) => {
    const [pathname, hash] = path.split("#");
    navigate(pathname);
    if (hash) window.setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 80);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegação principal"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5">
        {items.map(({ label, icon: Icon, path }) => {
          const active = path.startsWith("/client-category")
            ? location.pathname.startsWith("/client-category")
            : location.pathname === path;
          return (
            <button
              key={label}
              type="button"
              onClick={() => open(path)}
              className={`flex min-w-0 select-none flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
                active ? "text-[#3157D5]" : "text-slate-500"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : "stroke-2"}`} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
