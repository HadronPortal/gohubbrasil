import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Input } from "@/components/ui/input";
import { CLIENT_CATEGORIES, getCategoryBySlug } from "@/lib/clientCategories";
import {
  ArrowLeft,
  Search,
  Scissors,
  Star,
  Clock,
  MapPin,
  SlidersHorizontal,
  X,
} from "lucide-react";

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  description: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
}

type SavedLocation = {
  label: string;
  latitude?: number;
  longitude?: number;
};

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

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200/70 rounded ${className}`} />;
}

type FilterKey = "distance" | "rating" | "today" | "price" | "female" | "male";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "distance", label: "Distância" },
  { key: "rating", label: "Avaliação" },
  { key: "today", label: "Disponível hoje" },
  { key: "price", label: "Menor preço" },
  { key: "female", label: "Atendimento feminino" },
  { key: "male", label: "Atendimento masculino" },
];

type SavedState = {
  query: string;
  subcategory: string | null;
  filters: FilterKey[];
};

function loadState(slug: string): SavedState {
  try {
    const raw = sessionStorage.getItem(`gohub_cat_state_${slug}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { query: "", subcategory: null, filters: [] };
}

function saveState(slug: string, state: SavedState) {
  try {
    sessionStorage.setItem(`gohub_cat_state_${slug}`, JSON.stringify(state));
  } catch {}
}

export default function ClientCategory() {
  const { categorySlug = "todos" } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const category = useMemo(
    () => getCategoryBySlug(categorySlug) || getCategoryBySlug("todos")!,
    [categorySlug]
  );

  const initial = useMemo(() => loadState(categorySlug), [categorySlug]);
  const [query, setQuery] = useState(initial.query);
  const [subcategory, setSubcategory] = useState<string | null>(initial.subcategory);
  const [filters, setFilters] = useState<FilterKey[]>(initial.filters);

  const [shops, setShops] = useState<Barbershop[]>([]);
  const [services, setServices] = useState<{ barbershop_id: string; name: string; price: number }[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);

  const [location] = useState<SavedLocation | null>(() => {
    try {
      const raw = localStorage.getItem("gohub_location_v2");
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  // Auth gate
  useEffect(() => {
    if (authLoading) return;
    if (!user) navigate("/login", { replace: true });
  }, [user, authLoading, navigate]);

  // Persist state on change
  useEffect(() => {
    saveState(categorySlug, { query, subcategory, filters });
  }, [categorySlug, query, subcategory, filters]);

  // Reset subcategory when slug changes
  useEffect(() => {
    const next = loadState(categorySlug);
    setQuery(next.query);
    setSubcategory(next.subcategory);
    setFilters(next.filters);
  }, [categorySlug]);

  // Fetch shops + services
  useEffect(() => {
    if (!user || !profile) return;
    (async () => {
      setLoadingShops(true);
      try {
        const [{ data: shopsData }, { data: svcData }] = await Promise.all([
          supabase.rpc("get_available_barbershops"),
          supabase.from("services").select("barbershop_id,name,price"),
        ]);
        setShops((shopsData || []) as Barbershop[]);
        setServices((svcData || []) as any);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingShops(false);
      }
    })();
  }, [user, profile]);

  const toggleFilter = (k: FilterKey) =>
    setFilters((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  type Enriched = {
    shop: Barbershop;
    distanceKm: number | null;
    minPrice: number | null;
    serviceNames: string[];
    matchesCategory: boolean;
  };

  const enriched: Enriched[] = useMemo(() => {
    const svcByShop = new Map<string, { name: string; price: number }[]>();
    for (const s of services) {
      const arr = svcByShop.get(s.barbershop_id) || [];
      arr.push({ name: s.name, price: Number(s.price) || 0 });
      svcByShop.set(s.barbershop_id, arr);
    }
    const lat = location?.latitude;
    const lon = location?.longitude;
    return shops.map((shop) => {
      const svcs = svcByShop.get(shop.id) || [];
      const minPrice = svcs.length ? Math.min(...svcs.map((x) => x.price).filter((p) => p > 0)) : null;
      const slat = typeof shop.latitude === "number" ? shop.latitude : null;
      const slon = typeof shop.longitude === "number" ? shop.longitude : null;
      const d =
        typeof lat === "number" && typeof lon === "number" && slat !== null && slon !== null
          ? haversineKm(lat, lon, slat, slon)
          : null;
      const haystack = `${shop.name} ${shop.description || ""} ${svcs.map((s) => s.name).join(" ")}`.toLowerCase();
      const matchesCategory =
        category.id === "todos" ||
        category.keywords.length === 0 ||
        category.keywords.some((k) => haystack.includes(k.toLowerCase()));
      return {
        shop,
        distanceKm: Number.isFinite(minPrice as number) ? d : d,
        minPrice: Number.isFinite(minPrice as number) ? (minPrice as number) : null,
        serviceNames: svcs.map((s) => s.name),
        matchesCategory,
      };
    });
  }, [shops, services, location, category]);

  const filtered: Enriched[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enriched.filter((e) => e.matchesCategory);

    if (subcategory) {
      const sub = subcategory.toLowerCase();
      list = list.filter(
        (e) =>
          e.serviceNames.some((n) => n.toLowerCase().includes(sub)) ||
          e.shop.name.toLowerCase().includes(sub) ||
          (e.shop.description || "").toLowerCase().includes(sub)
      );
    }

    if (q) {
      list = list.filter(
        (e) =>
          e.shop.name.toLowerCase().includes(q) ||
          (e.shop.description || "").toLowerCase().includes(q) ||
          (e.shop.address || "").toLowerCase().includes(q) ||
          e.serviceNames.some((n) => n.toLowerCase().includes(q))
      );
    }

    if (filters.includes("today")) {
      // sem dados de agenda — manter visualmente; heurística: estabelecimento ativo (tem serviços)
      list = list.filter((e) => e.serviceNames.length > 0);
    }

    if (filters.includes("female")) {
      list = list.filter((e) =>
        e.serviceNames.some((n) => /femin|cabelo|unha|estética|estetica|sobrancel|maquiag|depila/i.test(n))
      );
    }
    if (filters.includes("male")) {
      list = list.filter((e) =>
        e.serviceNames.some((n) => /masculin|barba|corte|barbear/i.test(n))
      );
    }

    // Ordenação por prioridade: distance > price > rating(alpha)
    list = [...list].sort((a, b) => {
      if (filters.includes("distance") || (!filters.includes("price") && !filters.includes("rating"))) {
        const da = a.distanceKm ?? Infinity;
        const db = b.distanceKm ?? Infinity;
        if (da !== db) return da - db;
      }
      if (filters.includes("price")) {
        const pa = a.minPrice ?? Infinity;
        const pb = b.minPrice ?? Infinity;
        if (pa !== pb) return pa - pb;
      }
      if (filters.includes("rating")) {
        return a.shop.name.localeCompare(b.shop.name);
      }
      return 0;
    });

    return list;
  }, [enriched, query, subcategory, filters]);

  const sections = useMemo(() => {
    const near = [...filtered].sort(
      (a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity)
    );
    const today = filtered.filter((e) => e.serviceNames.length > 0);
    const top = [...filtered].sort((a, b) => a.shop.name.localeCompare(b.shop.name));
    const recent = [...filtered].sort((a, b) => {
      const ca = a.shop.created_at ? new Date(a.shop.created_at).getTime() : 0;
      const cb = b.shop.created_at ? new Date(b.shop.created_at).getTime() : 0;
      return cb - ca;
    });
    const deals = [...filtered].sort(
      (a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity)
    );
    return [
      { id: "near", title: "Perto de você", items: near },
      { id: "today", title: "Disponíveis hoje", items: today },
      { id: "top", title: "Mais bem avaliados", items: top },
      { id: "recent", title: "Últimos estabelecimentos", items: recent },
      { id: "deals", title: "Ofertas e destaques", items: deals },
    ].filter((s) => s.items.length > 0);
  }, [filtered]);

  const handleOpenShop = async (shop: Barbershop) => {
    try {
      await supabase.rpc("set_my_selected_barbershop", { p_barbershop_id: shop.id });
      localStorage.setItem("selectedBarbershopId", shop.id);
    } catch {}
    navigate(`/barbers?barbershopId=${shop.id}`);
  };

  if (authLoading) return <LoadingScreen />;

  const placeholder = `Buscar em ${category.label}`;

  return (
    <div
      className="min-h-screen bg-[#F7F9FC] text-[#172033] pb-24 overflow-x-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="max-w-md mx-auto">
        {/* ===== HEADER FIXO ===== */}
        <header
          className="sticky top-0 z-30 bg-[#F7F9FC]/95 backdrop-blur border-b border-slate-100"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="px-3 pt-3 pb-2 flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="select-none w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="w-5 h-5 text-[#172033]" />
            </button>
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="pl-9 bg-white border-slate-200 h-10 rounded-full text-sm"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="select-none absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center"
                  aria-label="Limpar"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Seletor horizontal de categorias */}
          <div className="flex gap-3 overflow-x-auto px-3 pb-3 no-scrollbar">
            {CLIENT_CATEGORIES.map((c) => {
              const isActive = c.id === category.id;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/client-category/${c.id}`)}
                  className="select-none flex flex-col items-center gap-1 flex-shrink-0 active:scale-95"
                >
                  <div
                    className={`w-14 h-14 rounded-[8px] bg-white flex items-center justify-center overflow-hidden shadow-sm ${
                      isActive
                        ? "ring-2 ring-[#4338CA] ring-offset-2 ring-offset-[#F7F9FC]"
                        : "border border-slate-100"
                    }`}
                  >
                    <img src={c.image} alt={c.label} className="w-[88%] h-[88%] object-contain" />
                  </div>
                  <span
                    className={`text-[10px] font-medium leading-tight ${
                      isActive ? "text-[#4338CA] font-semibold" : "text-[#172033]"
                    }`}
                  >
                    {c.label}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        {/* ===== SUBCATEGORIAS ===== */}
        {category.subcategories.length > 0 && (
          <section className="mt-3">
            <div className="flex gap-2 overflow-x-auto px-3 pb-1 no-scrollbar">
              <button
                onClick={() => setSubcategory(null)}
                className={`select-none flex-shrink-0 px-3 h-9 rounded-full text-sm font-medium border transition ${
                  subcategory === null
                    ? "bg-[#4338CA] text-white border-[#4338CA]"
                    : "bg-white text-[#172033] border-slate-200"
                }`}
              >
                Todos
              </button>
              {category.subcategories.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubcategory(s === subcategory ? null : s)}
                  className={`select-none flex-shrink-0 px-3 h-9 rounded-full text-sm font-medium border transition ${
                    subcategory === s
                      ? "bg-[#4338CA] text-white border-[#4338CA]"
                      : "bg-white text-[#172033] border-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ===== FILTROS ===== */}
        <section className="mt-3">
          <div className="flex gap-2 overflow-x-auto px-3 pb-1 no-scrollbar items-center">
            <div className="select-none flex-shrink-0 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
            </div>
            {FILTERS.map((f) => {
              const active = filters.includes(f.key);
              return (
                <button
                  key={f.key}
                  onClick={() => toggleFilter(f.key)}
                  className={`select-none flex-shrink-0 px-3 h-9 rounded-full text-xs font-semibold border transition ${
                    active
                      ? "bg-[#172033] text-white border-[#172033]"
                      : "bg-white text-[#172033] border-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ===== CONTEÚDO ===== */}
        <main className="mt-5 space-y-6">
          {loadingShops ? (
            <div className="px-4 space-y-3">
              <Skeleton className="h-20 w-full rounded-[8px]" />
              <Skeleton className="h-20 w-full rounded-[8px]" />
              <Skeleton className="h-20 w-full rounded-[8px]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4">
              <div className="bg-white border border-dashed border-slate-200 rounded-[8px] p-6 text-center">
                <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Nenhum estabelecimento encontrado em <strong>{category.label}</strong>.
                </p>
              </div>
            </div>
          ) : (
            sections.map((sec) => (
              <section key={sec.id}>
                <h2 className="px-4 mb-2 text-base font-bold text-[#172033]">{sec.title}</h2>
                <div className="px-4 space-y-3">
                  {sec.items.slice(0, 8).map((e) => (
                    <ShopRow
                      key={`${sec.id}-${e.shop.id}`}
                      e={e}
                      categoryLabel={category.label}
                      onClick={() => handleOpenShop(e.shop)}
                      sponsored={sec.id === "deals" && e.minPrice !== null}
                    />
                  ))}
                </div>
              </section>
            ))
          )}
        </main>
      </div>
    </div>
  );
}

function ShopRow({
  e,
  categoryLabel,
  onClick,
  sponsored,
}: {
  e: { shop: Barbershop; distanceKm: number | null; minPrice: number | null; serviceNames: string[] };
  categoryLabel: string;
  onClick: () => void;
  sponsored?: boolean;
}) {
  const { shop, distanceKm, minPrice } = e;
  return (
    <button
      onClick={onClick}
      className="select-none w-full flex items-center gap-3 bg-white rounded-[8px] border border-slate-100 hover:border-indigo-200 transition p-3 text-left active:scale-[0.99] shadow-sm"
    >
      <div className="w-16 h-16 rounded-[8px] bg-gradient-to-br from-sky-50 to-indigo-50 flex items-center justify-center shrink-0 overflow-hidden">
        {shop.logo_url ? (
          <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <Scissors className="w-6 h-6 text-indigo-300" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-[#172033] truncate flex-1">{shop.name}</p>
          {sponsored && (
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              Ad
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 truncate">{categoryLabel}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600 flex-wrap">
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-medium">Novo</span>
          </span>
          {distanceKm !== null && (
            <>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-0.5">
                <MapPin className="w-3 h-3" /> {formatDistance(distanceKm)}
              </span>
            </>
          )}
          {minPrice !== null && (
            <>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-[#4338CA]">
                a partir de R$ {minPrice.toFixed(0)}
              </span>
            </>
          )}
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-0.5 text-emerald-600">
            <Clock className="w-3 h-3" /> Disponível
          </span>
        </div>
      </div>
    </button>
  );
}