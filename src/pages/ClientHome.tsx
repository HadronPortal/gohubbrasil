import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ProfileModal } from "@/components/ProfileModal";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PromoCarousel } from "@/components/client/PromoCarousel";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { translateAppointmentStatus, statusBadgeClasses } from "@/lib/appointmentStatus";
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
  Loader2,
} from "lucide-react";

import iconBarbearias from "@/assets/categories/barbearias.png";
import iconCabelos from "@/assets/categories/cabelos.png";
import iconUnhas from "@/assets/categories/unhas.png";
import iconEstetica from "@/assets/categories/estetica.png";
import iconMassagem from "@/assets/categories/massagem.png";
import iconSobrancelhas from "@/assets/categories/sobrancelhas.png";
import iconMaquiagem from "@/assets/categories/maquiagem.png";
import iconDepilacao from "@/assets/categories/depilacao.png";
import iconPodologia from "@/assets/categories/podologia.png";
import iconPet from "@/assets/categories/pet.png";

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
  image: string;
};

const CATEGORIES: Category[] = [
  { id: "barbearias", label: "Barbearias", image: iconBarbearias },
  { id: "cabelos", label: "Cabelos", image: iconCabelos },
  { id: "unhas", label: "Unhas", image: iconUnhas },
  { id: "estetica", label: "Estética", image: iconEstetica },
  { id: "massoterapia", label: "Massagem", image: iconMassagem },
  { id: "sobrancelhas", label: "Sobrancelhas", image: iconSobrancelhas },
  { id: "maquiagem", label: "Maquiagem", image: iconMaquiagem },
  { id: "depilacao", label: "Depilação", image: iconDepilacao },
  { id: "podologia", label: "Podologia", image: iconPodologia },
  { id: "pet", label: "Pet", image: iconPet },
];

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  description: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category_slug?: string | null;
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

/* PromoCarousel moved to src/components/client/PromoCarousel.tsx */

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
      <div className="px-1.5 pt-2">
        <p className="text-sm font-semibold text-[#172033] truncate mt-0.5">{shop.name}</p>
        <p className="text-[11px] text-slate-500 truncate">{shop.address || "Sem endereço"}</p>
      </div>
    </button>
  );
}

/* ---------- Location helpers ---------- */
export type SavedLocation = {
  label: string;        // What shows in the header. NEVER coords.
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
};

function formatAddressLabel(a: Partial<SavedLocation>): string {
  const street = (a.street || "").trim();
  const num = (a.number || "").trim();
  const bairro = (a.neighborhood || "").trim();
  const cidade = (a.city || "").trim();
  if (street && num) return `${street}, ${num}`;
  if (street && bairro) return `${street}, ${bairro}`;
  if (street) return street;
  if (bairro && cidade) return `${bairro}, ${cidade}`;
  if (cidade) return cidade;
  return "Localização definida";
}

const IS_DEV = import.meta.env.DEV;

export type GeocodeResult =
  | { ok: true; source: "google" | "nominatim"; location: SavedLocation }
  | { ok: false; reason: GeocodeFailReason; message: string };

export type GeocodeListResult =
  | { ok: true; source: "google" | "nominatim"; results: SavedLocation[] }
  | { ok: false; reason: GeocodeFailReason; message: string };

export type GeocodeFailReason =
  | "not_found"
  | "key_missing"
  | "api_disabled"
  | "unauthorized"
  | "function_missing"
  | "network"
  | "unknown";

function classifyEdgeError(error: unknown, data: unknown): { reason: GeocodeFailReason; message: string } {
  const errAny = error as any;
  const dataAny = data as any;
  const msg = String(errAny?.message || dataAny?.error || "").toLowerCase();
  const status = errAny?.status ?? errAny?.context?.status;
  if (status === 401 || status === 403) return { reason: "unauthorized", message: "Acesso negado à função (401/403)." };
  if (status === 404) return { reason: "function_missing", message: "Edge Function google-geocode não publicada." };
  if (msg.includes("google_maps_api_key")) return { reason: "key_missing", message: "GOOGLE_MAPS_API_KEY não configurada." };
  if (msg.includes("request_denied") || msg.includes("api key") || msg.includes("disabled"))
    return { reason: "api_disabled", message: "Geocoding API desativada ou chave inválida." };
  if (msg.includes("not found") || msg.includes("zero_results") || msg.includes("nao encontrado") || msg.includes("não encontrado"))
    return { reason: "not_found", message: "Endereço não encontrado." };
  if (msg.includes("failed to fetch") || msg.includes("network")) return { reason: "network", message: "Falha de rede." };
  return { reason: "unknown", message: String(errAny?.message || dataAny?.error || "Erro desconhecido") };
}

function nominatimToLocation(item: any): SavedLocation {
  const a = item.address || {};
  const street = a.road || a.pedestrian || a.footway || "";
  const number = a.house_number || "";
  const neighborhood = a.suburb || a.neighbourhood || a.city_district || "";
  const city = a.city || a.town || a.village || a.municipality || "";
  const state = a.state_code || a.state || "";
  const postcode = a.postcode || "";
  const latitude = parseFloat(item.lat);
  const longitude = parseFloat(item.lon);
  const loc: SavedLocation = { label: "", street, number, neighborhood, city, state, postcode, latitude, longitude };
  loc.label = formatAddressLabel(loc);
  if (!loc.label || loc.label === "Localização definida") loc.label = item.display_name || "Endereço encontrado";
  return loc;
}

async function nominatimReverse(lat: number, lon: number): Promise<SavedLocation | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=pt-BR&lat=${lat}&lon=${lon}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.error) return null;
    return nominatimToLocation(data);
  } catch {
    return null;
  }
}

async function nominatimSearch(q: string): Promise<SavedLocation[]> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=pt-BR&limit=5&countrycodes=br&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) return [];
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    return arr.map(nominatimToLocation);
  } catch {
    return [];
  }
}

async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult> {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { ok: false, reason: "unknown", message: "Coordenadas inválidas." };
  }
  if (IS_DEV) console.log("[geocode/reverse] coords:", lat, lon);
  try {
    const { data, error } = await supabase.functions.invoke("google-geocode", {
      body: { mode: "reverse", latitude: lat, longitude: lon },
    });
    if (IS_DEV) console.log("[geocode/reverse] edge response:", { data, error });
    if (!error && data?.success && data.location) {
      return { ok: true, source: "google", location: data.location as SavedLocation };
    }
    const cls = classifyEdgeError(error, data);
    if (IS_DEV) console.warn("[geocode/reverse] edge fail → fallback Nominatim:", cls);
    const fb = await nominatimReverse(lat, lon);
    if (fb) return { ok: true, source: "nominatim", location: fb };
    return { ok: false, reason: cls.reason, message: cls.message };
  } catch (e) {
    if (IS_DEV) console.error("[geocode/reverse] exception:", e);
    const fb = await nominatimReverse(lat, lon);
    if (fb) return { ok: true, source: "nominatim", location: fb };
    return { ok: false, reason: "network", message: "Falha de rede ao geocodificar." };
  }
}

async function forwardGeocodeList(q: string): Promise<GeocodeListResult> {
  if (IS_DEV) console.log("[geocode/search] query:", q);
  try {
    const { data, error } = await supabase.functions.invoke("google-geocode", {
      body: { mode: "search", query: q },
    });
    if (IS_DEV) console.log("[geocode/search] edge response:", { data, error });
    if (!error && data?.success && data.location) {
      return { ok: true, source: "google", results: [data.location as SavedLocation] };
    }
    const cls = classifyEdgeError(error, data);
    if (IS_DEV) console.warn("[geocode/search] edge fail → fallback Nominatim:", cls);
    const fb = await nominatimSearch(q);
    if (fb.length > 0) return { ok: true, source: "nominatim", results: fb };
    return { ok: false, reason: cls.reason, message: cls.message };
  } catch (e) {
    if (IS_DEV) console.error("[geocode/search] exception:", e);
    const fb = await nominatimSearch(q);
    if (fb.length > 0) return { ok: true, source: "nominatim", results: fb };
    return { ok: false, reason: "network", message: "Falha de rede ao buscar endereço." };
  }
}

function describeGeocodeError(reason: GeocodeFailReason): string {
  switch (reason) {
    case "key_missing": return "Chave do Google não configurada no servidor.";
    case "api_disabled": return "Geocoding API desativada ou chave inválida.";
    case "unauthorized": return "Sem permissão para chamar a função de endereço.";
    case "function_missing": return "Função de endereço indisponível.";
    case "network": return "Sem conexão. Verifique sua internet.";
    case "not_found": return "Endereço não encontrado.";
    default: return "Não foi possível identificar o endereço.";
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0).replace(".", ",")} km`;
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
  onPick: (loc: SavedLocation) => void;
  current: SavedLocation | null;
}) {
  const [query, setQuery] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [results, setResults] = useState<SavedLocation[]>([]);
  const saved: SavedLocation[] = useMemo(() => {
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
    setPermissionDenied(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setRequesting(false);
        setResolving(true);
        const res = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setResolving(false);
        if (res.ok !== true) {
          toast.error(describeGeocodeError((res as any).reason));
          return;
        }
        onPick(res.location);
      },
      (err) => {
        setRequesting(false);
        setPermissionDenied(err.code === err.PERMISSION_DENIED);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Busque manualmente abaixo."
            : err.code === err.POSITION_UNAVAILABLE
            ? "GPS indisponível. Tente novamente ou busque manualmente."
            : err.code === err.TIMEOUT
            ? "Tempo esgotado ao obter GPS. Tente novamente."
            : "Não foi possível obter sua localização.";
        toast.error(msg);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const submitSearch = async () => {
    const v = query.trim();
    if (!v) return;
    setSearching(true);
    setResults([]);
    const res = await forwardGeocodeList(v);
    setSearching(false);
    if (res.ok !== true) {
      toast.error(describeGeocodeError((res as any).reason));
      return;
    }
    if (res.results.length === 1) {
      onPick(res.results[0]);
      setQuery("");
      return;
    }
    setResults(res.results);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-white border-slate-200 p-0 gap-0 flex flex-col w-[calc(100vw-32px)] max-w-[480px] translate-x-[-50%] translate-y-[-50%] rounded-[12px] sm:rounded-[12px]"
        style={{
          maxHeight: "calc(100dvh - 32px)",
          paddingTop: "max(env(safe-area-inset-top), 0px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-3 shrink-0">
          <DialogTitle className="text-[#172033]">Sua localização</DialogTitle>
          <DialogDescription className="text-slate-500">
            {current ? `Atual: ${current.label}` : "Defina sua localização para ver estabelecimentos próximos."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 space-y-4">
        <button
          onClick={useCurrentLocation}
          disabled={requesting || resolving}
          className="select-none w-full flex items-center gap-3 p-3 rounded-[8px] border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition text-left disabled:opacity-50"
        >
          <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
            <Navigation className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#172033]">Usar minha localização atual</p>
            <p className="text-xs text-slate-500 truncate">
              {requesting
                ? "Buscando sua localização..."
                : resolving
                ? "Identificando endereço..."
                : permissionDenied
                ? "Permissão negada — busque abaixo"
                : "Solicitar permissão de GPS"}
            </p>
          </div>
        </button>
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Pesquisar endereço, bairro ou CEP</label>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rua, número, bairro, cidade ou CEP"
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              className="bg-white border-slate-200 text-[#172033] min-w-0 flex-1"
              onFocus={(e) => {
                setTimeout(() => e.currentTarget?.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
              }}
            />
            <Button onClick={submitSearch} disabled={searching || !query.trim()} className="bg-[#4338CA] hover:bg-[#3730A3] text-white shrink-0">
              {searching ? "..." : "Buscar"}
            </Button>
          </div>
          {results.length > 0 && (
            <div className="space-y-1.5 max-h-56 overflow-auto border border-slate-100 rounded-[6px] p-1">
              {results.map((r, i) => (
                <button
                  key={`${r.label}-${i}`}
                  onClick={() => { onPick(r); setResults([]); setQuery(""); }}
                  className="select-none w-full flex items-start gap-2 p-2 rounded-[6px] hover:bg-slate-50 transition text-left"
                >
                  <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-[#172033] break-words min-w-0">{r.label}{r.city ? ` — ${r.city}${r.state ? `/${r.state}` : ""}` : ""}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {saved.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Endereços salvos</p>
            <div className="space-y-1.5 max-h-48 overflow-auto">
              {saved.map((s, i) => (
                <button
                  key={`${s.label}-${i}`}
                  onClick={() => onPick(s)}
                  className="select-none w-full flex items-center gap-3 p-2 rounded-[6px] hover:bg-slate-50 transition text-left"
                >
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-sm text-[#172033] truncate">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        </div>
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
  const [location, setLocation] = useState<SavedLocation | null>(() => {
    try {
      const raw = localStorage.getItem("gohub_location_v2");
      if (raw) return JSON.parse(raw);
      const legacy = localStorage.getItem("gohub_location");
      if (legacy && !/-?\d+\.\d+/.test(legacy)) return { label: legacy };
    } catch {}
    return null;
  });
  const [locationOpen, setLocationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelingAppointment, setCancelingAppointment] = useState(false);
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

  const loadAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try {
      const { data } = await supabase.rpc("get_my_appointments_safe");
      if (data?.success) setAppointments((data.active || []) as Appointment[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAppts(false);
    }
  }, []);

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
    loadAppointments();
  }, [user, profile, loadAppointments]);

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    setCancelingAppointment(true);
    try {
      const { data, error } = await supabase.rpc("cancel_my_appointment", {
        p_appointment_id: appointmentToCancel.id,
      });

      if (error) throw error;
      if (data && typeof data === "object" && "success" in data && !(data as any).success) {
        throw new Error((data as any).error || "Nao foi possivel cancelar o agendamento.");
      }

      setAppointments((current) =>
        current.filter((appointment) => appointment.id !== appointmentToCancel.id),
      );
      setAppointmentToCancel(null);
      toast.success("Agendamento cancelado. O estabelecimento sera avisado.");
      await loadAppointments();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cancelar agendamento.");
    } finally {
      setCancelingAppointment(false);
    }
  };

  const handlePickCategory = (id: string) => {
    setActiveCategory(id);
    localStorage.setItem("gohub_active_category", id);
    navigate(`/client-category/${id}`);
  };

  const handlePickLocation = (loc: SavedLocation) => {
    setLocation(loc);
    localStorage.setItem("gohub_location_v2", JSON.stringify(loc));
    try {
      const prev: SavedLocation[] = JSON.parse(
        localStorage.getItem("gohub_saved_addresses") || "[]"
      );
      const next = [loc, ...prev.filter((s) => s.label !== loc.label)].slice(0, 5);
      localStorage.setItem("gohub_saved_addresses", JSON.stringify(next));
    } catch {}
    setLocationOpen(false);
  };

  // Estabelecimentos ordenados por distância quando há localização do cliente.
  const shopsByDistance = useMemo(() => {
    const lat = location?.latitude;
    const lon = location?.longitude;
    if (typeof lat !== "number" || typeof lon !== "number") {
      return barbershops.map((s) => ({ shop: s, distanceKm: null as number | null }));
    }
    return barbershops
      .map((s) => {
        const slat = typeof s.latitude === "number" ? s.latitude : null;
        const slon = typeof s.longitude === "number" ? s.longitude : null;
        const d =
          slat !== null && slon !== null ? haversineKm(lat, lon, slat, slon) : null;
        return { shop: s, distanceKm: d };
      })
      .sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [barbershops, location]);

  const handleOpenShop = async (shop: Barbershop) => {
    try {
      await supabase.rpc("set_my_selected_barbershop", { p_barbershop_id: shop.id });
      localStorage.setItem("selectedBarbershopId", shop.id);
    } catch {}
    const categorySlug =
      shop.category_slug || (activeCategory !== "todos" ? activeCategory : "barbearias");
    navigate(`/client-business/${shop.id}?category=${encodeURIComponent(categorySlug)}`);
  };

  const handleTab = (k: string) => {
    setActiveTab(k);
    if (k === "profile") setProfileOpen(true);
    else if (k === "appts") navigate("/client-agenda");
    else if (k === "search") navigate("/client-category/todos");
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

  const activeAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    [appointments],
  );

  const getDirectionsUrl = (appointment: Appointment) => {
    const appointmentShop = appointment.barbershop_id
      ? barbershops.find((shop) => shop.id === appointment.barbershop_id)
      : undefined;

    if (!appointmentShop) return null;

    const destination =
      typeof appointmentShop.latitude === "number" &&
      typeof appointmentShop.longitude === "number"
        ? `${appointmentShop.latitude},${appointmentShop.longitude}`
        : appointmentShop.address || appointmentShop.name;

    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
  };

  if (authLoading) return <LoadingScreen />;

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#172033] pb-24 overflow-x-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-md mx-auto">
        {/* ===== HEADER ===== */}
        <header className="px-4 pt-4 pb-3 bg-[#F7F9FC]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <img
              src="/gohub-wordmark.png"
              alt="GoHub"
              className="w-[108px] h-auto max-h-[34px] object-contain object-left"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => toast.info("Promoções em breve")}
                className="select-none w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center active:scale-95 transition"
                aria-label="Ofertas"
              >
                <Gem className="w-5 h-5 text-[#4338CA]" />
              </button>
              <button
                onClick={() => toast.info("Notificações em breve")}
                className="select-none relative w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center active:scale-95 transition"
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
          <div className="flex items-start justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[12px] leading-tight text-slate-500">
                {greeting}, <span className="text-[#172033] font-medium">{firstName}</span>
              </p>
              <button
                onClick={() => setLocationOpen(true)}
                className="select-none mt-0.5 flex items-center gap-1 text-[#172033] max-w-full min-w-0"
              >
                <span className="truncate text-[14px] font-semibold leading-tight">
                  {location?.label || "Selecionar localização"}
                </span>
                <ChevronDown className="shrink-0 text-[#172033]" style={{ width: 16, height: 16 }} />
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
              const isActive = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handlePickCategory(c.id)}
                  className="select-none flex flex-col items-center gap-1.5 active:scale-95 transition"
                >
                  <div
                    className={`w-16 h-16 rounded-[8px] bg-white flex items-center justify-center transition shadow-sm overflow-hidden ${
                      isActive ? "ring-2 ring-[#4338CA] ring-offset-2 ring-offset-[#F7F9FC]" : "border border-slate-100"
                    }`}
                  >
                    <img
                      src={c.image}
                      alt={c.label}
                      width={64}
                      height={64}
                      loading="lazy"
                      className="w-[88%] h-[88%] object-contain"
                    />
                  </div>
                  <span className="text-[11px] text-center text-[#172033] font-medium leading-tight px-0.5 line-clamp-1">
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== INSTALL PWA BANNER ===== */}
        <PWAInstallBanner />

        {/* ===== BANNER PROMO ===== */}
        <section className="mt-5">
          <PromoCarousel />
        </section>

        {/* ===== PRÓXIMO AGENDAMENTO ===== */}
        <section id="proximos" className="mt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="text-lg font-bold text-[#172033]">Seu próximo agendamento</h2>
          </div>
          <div className="px-4">
            {loadingAppts ? (
              <Skeleton className="h-24 w-full rounded-[8px]" />
            ) : activeAppointments.length > 0 ? (
              <div className="space-y-3">
                {activeAppointments.map((appointment) => {
                  const directionsUrl = getDirectionsUrl(appointment);

                  return (
                    <div
                      key={appointment.id}
                      className="w-full bg-white border border-slate-100 rounded-[8px] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-[#4338CA] font-semibold uppercase tracking-wide">
                            {appointment.service_name}
                          </p>
                          <p className="text-sm font-semibold text-[#172033] truncate mt-0.5">
                            {appointment.barbershop_name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            com {appointment.barber_name}
                          </p>
                        </div>
                         <div className="text-right shrink-0">
                           <p className="text-xs text-slate-500">
                             {format(new Date(appointment.starts_at), "dd/MM", { locale: ptBR })}
                           </p>
                           <p className="text-sm font-bold text-[#172033]">
                             {format(new Date(appointment.starts_at), "HH:mm")}
                           </p>
                           <span className={`inline-block mt-1 text-[10px] font-semibold border px-2 py-0.5 rounded ${statusBadgeClasses(appointment.status)}`}>
                             {translateAppointmentStatus(appointment.status)}
                           </span>
                         </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                        <span className="text-xs font-semibold text-slate-500">
                          R$ {Number(appointment.price || 0).toFixed(2).replace(".", ",")}
                        </span>
                        <div className="flex shrink-0 items-center gap-2">
                           <button
                             type="button"
                             onClick={() => setAppointmentToCancel(appointment)}
                             className="inline-flex min-h-[40px] items-center justify-center rounded-[8px] border border-red-700 bg-red-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-red-700 active:scale-95"
                           >
                             Cancelar
                           </button>
                          {directionsUrl && (
                            <a
                              href={directionsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#3157D5] px-3 text-xs font-bold text-white"
                            >
                              <MapPin className="h-4 w-4" /> Como chegar
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
            <div className="pl-7 pr-5 flex gap-3 overflow-hidden">
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
            <div className="flex gap-4 overflow-x-auto pl-7 pr-5 pb-2 snap-x snap-mandatory">
              {shopsByDistance.map(({ shop: s, distanceKm }, i) => (
                <div key={s.id} className="snap-start first:ml-1">
                  <ShopMiniCard
                    shop={s}
                    badge={distanceKm !== null ? formatDistance(distanceKm) : i === 0 ? "Ad" : undefined}
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
              {shopsByDistance.slice(0, 6).map(({ shop: s, distanceKm }) => (
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
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[#172033] truncate">{s.name}</p>
                      {distanceKm !== null && (
                        <span className="text-[11px] font-semibold text-[#4338CA] bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                          {formatDistance(distanceKm)}
                        </span>
                      )}
                    </div>
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
      <AlertDialog
        open={Boolean(appointmentToCancel)}
        onOpenChange={(open) => {
          if (!open && !cancelingAppointment) setAppointmentToCancel(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-32px)] max-w-sm rounded-[16px] border-0 bg-white p-5 text-[#172033]">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="text-lg font-extrabold">
              Cancelar agendamento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-slate-600">
              Seu horario sera liberado para outros clientes e o estabelecimento recebera
              uma notificacao do cancelamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:space-x-0">
            <AlertDialogCancel
              disabled={cancelingAppointment}
              className="mt-0 h-11 rounded-[8px] border border-slate-300 bg-white font-bold text-[#172033] hover:bg-slate-50"
            >
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleCancelAppointment();
              }}
              disabled={cancelingAppointment}
              className="h-11 rounded-[8px] bg-red-600 font-bold text-white hover:bg-red-700"
            >
              {cancelingAppointment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando
                </>
              ) : (
                "Confirmar cancelamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
