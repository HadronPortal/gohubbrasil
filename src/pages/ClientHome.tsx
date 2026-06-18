import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileModal } from "@/components/ProfileModal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  ChevronDown,
  X,
  MapPin,
  Navigation,
  Gem,
  Scissors,
  Brush,
  Sparkles,
  Heart,
  Hand,
  Eye,
  Palette,
  Flower2,
  Footprints,
  LayoutGrid,
  Home,
  Search,
  Calendar,
  User as UserIcon,
  Star,
  Clock,
} from "lucide-react";

/* ============================================================
 * GoHub — Home do Cliente (layout estilo iFood, cores GoHub)
 * ============================================================ */

const COLORS = {
  bg: "#F7F9FC",
  surface: "#FFFFFF",
  primary: "#4338CA",
  secondary: "#0EA5E9",
  accent: "#FF6B6B",
  text: "#172033",
};

type Category = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  fg: string;
};

const CATEGORIES: Category[] = [
  { id: "barbearias", label: "Barbearias", icon: Scissors, bg: "bg-indigo-50", fg: "text-indigo-600" },
  { id: "cabeleireiros", label: "Cabelos", icon: Brush, bg: "bg-sky-50", fg: "text-sky-600" },
  { id: "unhas", label: "Unhas", icon: Sparkles, bg: "bg-rose-50", fg: "text-rose-500" },
  { id: "estetica", label: "Estética", icon: Heart, bg: "bg-pink-50", fg: "text-pink-500" },
  { id: "massoterapia", label: "Massagem", icon: Hand, bg: "bg-emerald-50", fg: "text-emerald-600" },
  { id: "sobrancelhas", label: "Sobrancelhas", icon: Eye, bg: "bg-amber-50", fg: "text-amber-600" },
  { id: "maquiagem", label: "Maquiagem", icon: Palette, bg: "bg-fuchsia-50", fg: "text-fuchsia-600" },
  { id: "depilacao", label: "Depilação", icon: Flower2, bg: "bg-teal-50", fg: "text-teal-600" },
  { id: "podologia", label: "Podologia", icon: Footprints, bg: "bg-orange-50", fg: "text-orange-500" },
  { id: "todos", label: "Ver mais", icon: LayoutGrid, bg: "bg-violet-50", fg: "text-violet-600" },
];

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  description: string | null;
}

interface Appointment {
  id: string;
  status: string;
  starts_at: string;
  price: number;
  barbershop_name: string;
  barber_name: string;
  barber_avatar_url: string | null;
  service_name: string;
  barbershop_id?: string;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/70 rounded ${className}`} />;
}

/* ---------- Banner carousel (promo) ---------- */
function PromoCarousel({ shops }: { shops: Barbershop[] }) {
  const [idx, setIdx] = useState(0);
  const slides = useMemo(() => {
    const base = [
      {
        title: "GoHub Beleza",
        subtitle: "Reserve em segundos, sem fila",
        cta: "até 30% OFF",
        from: "from-[#4338CA]",
        to: "to-[#6366F1]",
        icon: Sparkles,
      },
      {
        title: "Cuide de você",
        subtitle: "Profissionais perto de você",
        cta: "Agende agora",
        from: "from-[#0EA5E9]",
        to: "to-[#38BDF8]",
        icon: Heart,
      },
      {
        title: "Indique e ganhe",
        subtitle: "Convide um amigo no GoHub",
        cta: "Ganhe R$ 20",
        from: "from-[#FF6B6B]",
        to: "to-[#FB7185]",
        icon: Gem,
      },
    ];
    return base;
  }, [shops]);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  const slide = slides[idx];
  const Icon = slide.icon;

  return (
    <div className="px-4">
      <div
        className={`relative w-full h-44 rounded-[8px] overflow-hidden bg-gradient-to-br ${slide.from} ${slide.to} text-white shadow-sm`}
      >
        <div className="absolute inset-0 p-5 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold opacity-90 uppercase tracking-wide">
              {slide.title}
            </p>
            <h3 className="mt-1 text-2xl font-bold leading-tight max-w-[60%]">
              {slide.subtitle}
            </h3>
          </div>
          <span className="inline-flex w-fit items-center gap-1 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold">
            {slide.cta}
          </span>
        </div>
        <Icon className="absolute -right-2 -bottom-2 w-32 h-32 text-white/15" />
      </div>
      <div className="flex justify-center gap-1.5 mt-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`select-none h-1.5 rounded-full transition-all ${
              i === idx ? "w-6 bg-[#4338CA]" : "w-1.5 bg-slate-300"
            }`}
            aria-label={`Ir para slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Shop card (Últimas lojas) ---------- */
function ShopMiniCard({ shop, badge, onClick }: { shop: Barbershop; badge?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="select-none flex-shrink-0 w-36 text-left active:scale-[0.98] transition"
    >
      <div className="relative h-32 w-36 rounded-[8px] bg-white border border-slate-100 overflow-hidden flex items-center justify-center shadow-sm">
        {shop.logo_url ? (
          <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-sky-50 flex items-center justify-center">
            <Scissors className="w-8 h-8 text-indigo-300" />
          </div>
        )}
        {badge && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-slate-600 bg-white/95 px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>
      <div className="px-1 pt-2">
        <p className="text-[11px] font-bold text-[#FF6B6B]">Grátis a 1ª visita</p>
        <p className="text-sm font-semibold text-[#172033] truncate mt-0.5">{shop.name}</p>
        <p className="text-[11px] text-slate-500 truncate">{shop.address || "Sem endereço"}</p>
      </div>
    </button>
  );
}

/* ---------- Location modal ---------- */
function LocationModal({
  open,
  onOpenChange,
  onPick,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (label: string) => void;
  current: string | null;
}) {
  const [query, setQuery] = useState("");
  const [requesting, setRequesting] = useState(false);
  const saved: string[] = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("gohub_saved_addresses") || "[]");
    } catch {
      return [];
    }
  }, [open]);

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocalização indisponível neste dispositivo.");
      return;
    }
    setRequesting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const label = `Localização atual (${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)})`;
        onPick(label);
        setRequesting(false);
      },
      () => {
        toast.error("Não foi possível obter sua localização. Use a busca.");
        setRequesting(false);
      },
      { timeout: 8000 }
    );
  };

  const submitSearch = () => {
    const v = query.trim();
    if (!v) return;
    const next = [v, ...saved.filter((s) => s !== v)].slice(0, 5);
    localStorage.setItem("gohub_saved_addresses", JSON.stringify(next));
    onPick(v);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-slate-200 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#172033]">Sua localização</DialogTitle>
          <DialogDescription className="text-slate-500">
            {current ? `Atual: ${current}` : "Defina sua localização para ver estabelecimentos próximos."}
          </DialogDescription>
        </DialogHeader>
        <button
          onClick={useCurrentLocation}
          disabled={requesting}
          className="select-none w-full flex items-center gap-3 p-3 rounded-[8px] border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition text-left disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#172033]">Usar localização atual</p>
            <p className="text-xs text-slate-500">{requesting ? "Buscando..." : "Permitir GPS"}</p>
          </div>
        </button>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Pesquisar endereço</label>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rua, bairro ou cidade"
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              className="bg-white border-slate-200 text-[#172033]"
            />
            <Button onClick={submitSearch} className="bg-[#4338CA] hover:bg-[#3730A3] text-white">
              Usar
            </Button>
          </div>
        </div>
        {saved.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Endereços salvos</p>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {saved.map((s) => (
                <button
                  key={s}
                  onClick={() => onPick(s)}
                  className="select-none w-full flex items-center gap-3 p-2 rounded-[6px] hover:bg-slate-50 transition text-left"
                >
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-[#172033] truncate">{s}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Bottom nav (4 itens) ---------- */
function BottomNav({ active, onChange }: { active: string; onChange: (k: string) => void }) {
  const items = [
    { key: "home", label: "Início", icon: Home },
    { key: "search", label: "Busca", icon: Search },
    { key: "appts", label: "Agenda", icon: Calendar },
    { key: "profile", label: "Perfil", icon: UserIcon },
  ];
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto grid grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => onChange(it.key)}
              className={`select-none flex flex-col items-center justify-center py-2.5 gap-1 transition ${
                isActive ? "text-[#4338CA]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[11px] ${isActive ? "font-bold" : "font-medium"}`}>
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ============================================================
 * MAIN PAGE
 * ============================================================ */
export default function ClientHome() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingAppts, setLoadingAppts] = useState(true);

  const [activeCategory, setActiveCategory] = useState<string | null>(() =>
    localStorage.getItem("gohub_active_category")
  );
  const [location, setLocation] = useState<string | null>(() =>
    localStorage.getItem("gohub_location")
  );
  const [locationOpen, setLocationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [showPromoStrip, setShowPromoStrip] = useState(true);
  const [notifCount] = useState(0);

  // Role-based routing — só clientes ficam aqui
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!profile) return;
    const role = String(profile.role || "client").toLowerCase();
    const force = localStorage.getItem("force_barber_panel") === "true";
    if (!force) {
      if (role === "superadmin") return navigate("/super-admin", { replace: true });
      if (role === "owner" || role === "admin") return navigate("/admin", { replace: true });
      if (role === "barber") return navigate("/barber-dashboard", { replace: true });
    }
  }, [user, profile, authLoading, navigate]);

  // Fetch
  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setLoadingShops(true);
      try {
        const { data, error } = await supabase.rpc("get_available_barbershops");
        if (error) throw error;
        setBarbershops((data || []) as Barbershop[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingShops(false);
      }
    })();
    (async () => {
      setLoadingAppts(true);
      try {
        const { data } = await supabase.rpc("get_my_appointments_safe");
        if (data?.success) setAppointments((data.active || []) as Appointment[]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAppts(false);
      }
    })();
  }, [user, profile]);

  const handlePickCategory = (id: string) => {
    setActiveCategory(id);
    localStorage.setItem("gohub_active_category", id);
    document.getElementById("ultimas-lojas")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePickLocation = (label: string) => {
    setLocation(label);
    localStorage.setItem("gohub_location", label);
    setLocationOpen(false);
  };

  const handleOpenShop = async (shop: Barbershop) => {
    try {
      await supabase.rpc("set_my_selected_barbershop", { p_barbershop_id: shop.id });
      localStorage.setItem("selectedBarbershopId", shop.id);
    } catch {}
    navigate(`/barbers?barbershopId=${shop.id}`);
  };

  const handleTab = (k: string) => {
    setActiveTab(k);
    if (k === "profile") setProfileOpen(true);
    else if (k === "appts") document.getElementById("proximos")?.scrollIntoView({ behavior: "smooth" });
    else if (k === "search") toast.info("Busca em breve");
    else if (k === "home") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return "Bom dia";
    if (h >= 12 && h < 18) return "Boa tarde";
    return "Boa noite";
  })();

  const firstName = (profile?.name || user?.user_metadata?.name || user?.email || "cliente")
    .split(" ")[0]
    .toLowerCase();

  const nextAppt = appointments[0];

  if (authLoading) return <LoadingScreen />;

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#172033] pb-24"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-md mx-auto">
        {/* ===== HEADER ===== */}
        <header className="px-4 pt-4 pb-3 bg-[#F7F9FC]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-500">
                {greeting}, <span className="text-[#172033] font-medium">{firstName}</span>
              </p>
              <button
                onClick={() => setLocationOpen(true)}
                className="select-none mt-1 flex items-center gap-1 text-[#172033] font-bold text-base max-w-full"
              >
                <span className="truncate max-w-[230px]">
                  {location || "Selecionar localização"}
                </span>
                <ChevronDown className="w-4 h-4 shrink-0 text-[#172033]" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => toast.info("Promoções em breve")}
                className="select-none w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center active:scale-95 transition"
                aria-label="Ofertas"
              >
                <Gem className="w-5 h-5 text-[#4338CA]" />
              </button>
              <button
                onClick={() => toast.info("Notificações em breve")}
                className="select-none relative w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center active:scale-95 transition"
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5 text-[#172033]" />
                {notifCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-[#FF6B6B] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-[#F7F9FC]">
                    {notifCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Promo strip */}
          {showPromoStrip && (
            <div className="mt-3 bg-indigo-50 rounded-[8px] px-4 py-2.5 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#4338CA] truncate">
                30% off no plano trimestral!
              </p>
              <button
                onClick={() => setShowPromoStrip(false)}
                className="select-none text-[#4338CA] shrink-0"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {/* ===== CATEGORIAS (5 col × 2 lin) ===== */}
        <section className="px-3 mt-2">
          <div className="grid grid-cols-5 gap-1 gap-y-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handlePickCategory(c.id)}
                  className="select-none flex flex-col items-center gap-1.5 active:scale-95 transition"
                >
                  <div
                    className={`w-14 h-14 rounded-full ${c.bg} ${
                      isActive ? "ring-2 ring-[#4338CA] ring-offset-2 ring-offset-[#F7F9FC]" : ""
                    } flex items-center justify-center transition shadow-sm`}
                  >
                    <Icon className={`w-6 h-6 ${c.fg}`} />
                  </div>
                  <span className="text-[11px] text-center text-[#172033] font-medium leading-tight px-0.5 line-clamp-1">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== BANNER PROMO ===== */}
        <section className="mt-5">
          <PromoCarousel shops={barbershops} />
        </section>

        {/* ===== PRÓXIMO AGENDAMENTO ===== */}
        <section id="proximos" className="mt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-[#172033]">Seu próximo agendamento</h2>
          </div>
          <div className="px-4">
            {loadingAppts ? (
              <Skeleton className="h-24 w-full rounded-[8px]" />
            ) : nextAppt ? (
              <button
                onClick={() => navigate(`/barbers?barbershopId=${nextAppt.barbershop_id}`)}
                className="select-none w-full text-left bg-white border border-slate-100 rounded-[8px] p-4 hover:border-indigo-200 transition shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-[#4338CA] font-semibold uppercase tracking-wide">
                      {nextAppt.service_name}
                    </p>
                    <p className="text-sm font-semibold text-[#172033] truncate mt-0.5">
                      {nextAppt.barbershop_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">com {nextAppt.barber_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">
                      {format(new Date(nextAppt.starts_at), "dd/MM", { locale: ptBR })}
                    </p>
                    <p className="text-sm font-bold text-[#172033]">
                      {format(new Date(nextAppt.starts_at), "HH:mm")}
                    </p>
                    <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Confirmado
                    </span>
                  </div>
                </div>
              </button>
            ) : (
              <div className="bg-white border border-dashed border-slate-200 rounded-[8px] p-5 text-center">
                <Calendar className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Você não tem agendamentos ativos.</p>
              </div>
            )}
          </div>
        </section>

        {/* ===== ÚLTIMAS LOJAS ===== */}
        <section id="ultimas-lojas" className="mt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-[#172033]">Últimas lojas</h2>
            <button
              onClick={() => navigate("/", { state: { select: true } })}
              className="text-sm text-[#FF6B6B] font-semibold"
            >
              Ver mais
            </button>
          </div>
          {loadingShops ? (
            <div className="px-4 flex gap-3 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-44 w-36 flex-shrink-0 rounded-[8px]" />
              ))}
            </div>
          ) : barbershops.length === 0 ? (
            <div className="px-4">
              <div className="bg-white border border-dashed border-slate-200 rounded-[8px] p-5 text-center">
                <Scissors className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nenhum estabelecimento encontrado.</p>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
              {barbershops.map((s, i) => (
                <div key={s.id} className="snap-start">
                  <ShopMiniCard
                    shop={s}
                    badge={i === 0 ? "Ad" : undefined}
                    onClick={() => handleOpenShop(s)}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===== PERTO DE VOCÊ ===== */}
        <section className="mt-4">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-[#172033]">Perto de você</h2>
            <button
              onClick={() => navigate("/", { state: { select: true } })}
              className="text-sm text-[#FF6B6B] font-semibold"
            >
              Ver mais
            </button>
          </div>
          {loadingShops ? (
            <div className="px-4 space-y-3">
              <Skeleton className="h-20 w-full rounded-[8px]" />
              <Skeleton className="h-20 w-full rounded-[8px]" />
            </div>
          ) : (
            <div className="px-4 space-y-3">
              {barbershops.slice(0, 4).map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleOpenShop(s)}
                  className="select-none w-full flex items-center gap-3 bg-white rounded-[8px] border border-slate-100 hover:border-indigo-200 transition p-3 text-left active:scale-[0.99] shadow-sm"
                >
                  <div className="w-14 h-14 rounded-[8px] bg-gradient-to-br from-sky-50 to-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      <Scissors className="w-6 h-6 text-indigo-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#172033] truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {s.description || s.address || "Estabelecimento parceiro"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="font-medium">Novo</span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <Clock className="w-3 h-3" /> Disponível
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav active={activeTab} onChange={handleTab} />

      <LocationModal
        open={locationOpen}
        onOpenChange={setLocationOpen}
        onPick={handlePickLocation}
        current={location}
      />
      <ProfileModal isOpen={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}