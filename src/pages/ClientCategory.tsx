import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ClientBottomNav } from "@/components/client/ClientBottomNav";
import { CLIENT_CATEGORIES, getCategoryBySlug } from "@/lib/clientCategories";
import { getServiceVisual } from "@/lib/serviceVisuals";

type Shop = {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  description: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
  category_slug?: string | null;
  category_id?: string | null;
  blocked?: boolean | null;
};

type Service = { barbershop_id: string; name: string; price: number };
type SavedLocation = { label: string; latitude?: number; longitude?: number };
type FilterKey = "distance" | "today" | "rating" | "price";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "distance", label: "Mais próximos" },
  { key: "today", label: "Disponível hoje" },
  { key: "rating", label: "Melhor avaliados" },
  { key: "price", label: "Menor preço" },
];

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.asin(Math.sqrt(a));
}

function formatDistance(value: number | null) {
  if (value === null) return null;
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${value.toFixed(value < 10 ? 1 : 0).replace(".", ",")} km`;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[8px] bg-slate-200/80 ${className}`} />;
}

export default function ClientCategory() {
  const { categorySlug = "todos" } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const category = getCategoryBySlug(categorySlug) || getCategoryBySlug("todos")!;

  const [query, setQuery] = useState("");
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterKey[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [location] = useState<SavedLocation | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("gohub_location_v2") || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    setSubcategory(null);
    setQuery("");
  }, [categorySlug]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: shopData, error: shopError }, { data: serviceData, error: serviceError }] =
        await Promise.all([
          supabase.rpc("get_available_barbershops"),
          supabase.from("services").select("barbershop_id,name,price"),
        ]);
      if (!active) return;
      if (shopError) {
        console.error("Erro ao carregar estabelecimentos:", shopError);
      }
      if (serviceError) {
        console.error("Erro ao carregar serviços:", serviceError);
      }
      setShops((shopData || []) as Shop[]);
      setServices((serviceData || []) as Service[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const stores = useMemo(() => {
    const grouped = new Map<string, Service[]>();
    services.forEach((service) => {
      const current = grouped.get(service.barbershop_id) || [];
      current.push({ ...service, price: Number(service.price) || 0 });
      grouped.set(service.barbershop_id, current);
    });

    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const lat = location?.latitude;
    const lon = location?.longitude;

    const result = shops
      .map((shop) => {
        const shopServices = grouped.get(shop.id) || [];
        const content = [shop.name, shop.description, ...shopServices.map((item) => item.name)]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR");
        const matchesCategory =
          category.id === "todos" || (shop.category_slug || "") === category.id;
        const matchesSubcategory = !subcategory || content.includes(subcategory.toLocaleLowerCase("pt-BR"));
        const matchesSearch = !normalizedQuery || content.includes(normalizedQuery);
        const minPrice = shopServices.length
          ? Math.min(...shopServices.map((item) => item.price).filter((price) => price > 0))
          : null;
        const distance =
          typeof lat === "number" &&
          typeof lon === "number" &&
          typeof shop.latitude === "number" &&
          typeof shop.longitude === "number"
            ? distanceKm(lat, lon, shop.latitude, shop.longitude)
            : null;
        return { shop, services: shopServices, minPrice, distance, matchesCategory, matchesSubcategory, matchesSearch };
      })
      .filter((item) => item.matchesCategory && item.matchesSubcategory && item.matchesSearch);

    return result.sort((a, b) => {
      if (filters.includes("price")) return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
      if (filters.includes("distance")) return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      return a.shop.name.localeCompare(b.shop.name, "pt-BR");
    });
  }, [category, filters, location, query, services, shops, subcategory]);

  const toggleFilter = (key: FilterKey) =>
    setFilters((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  const openShop = (shopId: string) => navigate(`/client-business/${shopId}?category=${category.id}`);

  if (authLoading) return <LoadingScreen />;

  return (
    <div className="gohub-client min-h-screen overflow-x-hidden bg-[#F6F7FB] pb-24 text-[#172033]">
      <div className="mx-auto max-w-md">
        <header
          className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur-xl"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-2 px-4 pb-3 pt-3">
            <button
              type="button"
              onClick={() => navigate("/client-home")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 transition active:scale-95"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Buscar em ${category.label}`}
                className="h-11 rounded-full border-0 bg-slate-100 pl-11 pr-10 text-sm shadow-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3">
            {CLIENT_CATEGORIES.map((item) => {
              const selected = item.id === category.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(`/client-category/${item.id}`)}
                  className={`flex h-10 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-semibold transition active:scale-[0.98] ${
                    selected ? "text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700"
                  }`}
                  style={selected ? { backgroundColor: category.accent } : undefined}
                >
                  <img src={item.image} alt="" className="h-7 w-7 object-contain" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </header>

        <main>
          <section className="px-4 pt-4">
            <div
              className="relative min-h-40 overflow-hidden rounded-[8px] p-5"
              style={{ backgroundColor: category.soft }}
            >
              <div className="relative z-10 max-w-[68%]">
                <p className="text-[11px] font-bold uppercase text-slate-500">{category.eyebrow}</p>
                <h1 className="mt-2 text-[22px] font-extrabold leading-tight">{category.headline}</h1>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">Agende online com profissionais selecionados pelo GoHub.</p>
              </div>
              <img
                src={category.image}
                alt=""
                className="absolute -bottom-3 -right-1 h-36 w-36 object-contain drop-shadow-xl"
              />
            </div>
          </section>

          {category.subcategories.length > 0 && (
            <section className="pt-6">
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-lg font-extrabold">Explore serviços</h2>
                {subcategory && (
                  <button type="button" onClick={() => setSubcategory(null)} className="text-xs font-semibold text-[#3157D5]">
                    Limpar
                  </button>
                )}
              </div>
              <div className="no-scrollbar flex items-start gap-3 overflow-x-auto px-4 pb-2">
                {category.subcategories.map((item) => {
                  const selected = subcategory === item;
                  const visual = getServiceVisual(item, category.id);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSubcategory(selected ? null : item)}
                      className="grid w-[76px] shrink-0 grid-rows-[64px_36px] gap-2 text-center active:scale-95"
                    >
                      <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[8px] border bg-white ${
                          selected ? "ring-2 ring-offset-2" : "border-slate-100"
                        }`}
                        style={selected ? { borderColor: category.accent, color: category.accent } : undefined}
                      >
                        <img
                          src={visual.image}
                          alt=""
                          loading="lazy"
                          width={48}
                          height={48}
                          className="h-12 w-12 object-contain"
                        />
                      </div>
                      <span className="flex h-9 items-start justify-center text-center text-[11px] font-semibold leading-[14px] text-slate-700 line-clamp-2">
                        {item}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <section className="pt-5">
            <div className="no-scrollbar flex items-center gap-2 overflow-x-auto px-4 pb-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              {FILTERS.map((filter) => {
                const selected = filters.includes(filter.key);
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => toggleFilter(filter.key)}
                    className={`h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${
                      selected ? "border-[#172033] bg-[#172033] text-white" : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pt-5">
            <div className="mb-3 flex items-end justify-between px-4">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-400">Selecionados para você</p>
                <h2 className="mt-1 text-xl font-extrabold">{category.label} perto de você</h2>
              </div>
              <span className="text-xs text-slate-500">{stores.length} locais</span>
            </div>

            {loading ? (
              <div className="no-scrollbar flex gap-3 overflow-hidden px-4">
                {[1, 2].map((item) => <Skeleton key={item} className="h-64 w-[82%] shrink-0" />)}
              </div>
            ) : stores.length === 0 ? (
              <div className="px-4">
                <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-8 text-center">
                  <Search className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold">Nenhum estabelecimento encontrado</p>
                  <p className="mt-1 text-xs text-slate-500">Tente outra categoria ou remova os filtros.</p>
                </div>
              </div>
            ) : (
              <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
                {stores.slice(0, 8).map((item, index) => (
                  <FeaturedStore
                    key={item.shop.id}
                    item={item}
                    categoryLabel={category.label}
                    accent={category.accent}
                    index={index}
                    onClick={() => openShop(item.shop.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {!loading && stores.length > 0 && (
            <section className="px-4 pb-6 pt-7">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-extrabold">Todos os estabelecimentos</h2>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
              <div className="space-y-3">
                {stores.map((item) => (
                  <StoreRow key={item.shop.id} item={item} accent={category.accent} onClick={() => openShop(item.shop.id)} />
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
      <ClientBottomNav />
    </div>
  );
}

type StoreItem = {
  shop: Shop;
  services: Service[];
  minPrice: number | null;
  distance: number | null;
};

function FeaturedStore({ item, categoryLabel, accent, index, onClick }: { item: StoreItem; categoryLabel: string; accent: string; index: number; onClick: () => void }) {
  const distance = formatDistance(item.distance);
  return (
    <button type="button" onClick={onClick} className="w-[82%] shrink-0 snap-start overflow-hidden rounded-[8px] border border-slate-200 bg-white text-left shadow-sm transition active:scale-[0.99]">
      <div className="relative h-36 overflow-hidden bg-slate-100">
        {item.shop.logo_url ? (
          <img src={item.shop.logo_url} alt={item.shop.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center" style={{ backgroundColor: `${accent}16` }}>
            <Sparkles className="h-10 w-10" style={{ color: accent }} />
          </div>
        )}
        {index === 0 && <span className="absolute left-3 top-3 rounded bg-white px-2 py-1 text-[10px] font-bold text-slate-700 shadow">Destaque</span>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-extrabold">{item.shop.name}</h3>
            <p className="mt-0.5 truncate text-xs text-slate-500">{categoryLabel} • {item.shop.address || "Estabelecimento parceiro"}</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-amber-600"><Star className="h-3.5 w-3.5 fill-current" /> Novo</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
          {distance && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{distance}</span>}
          {item.minPrice !== null && <span>• a partir de R$ {item.minPrice.toFixed(0)}</span>}
        </div>
      </div>
    </button>
  );
}

function StoreRow({ item, accent, onClick }: { item: StoreItem; accent: string; onClick: () => void }) {
  const distance = formatDistance(item.distance);
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-[8px] border border-slate-200 bg-white p-3 text-left transition active:scale-[0.99]">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[8px]" style={{ backgroundColor: `${accent}14` }}>
        {item.shop.logo_url ? <img src={item.shop.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-6 w-6" style={{ color: accent }} />}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold">{item.shop.name}</h3>
        <p className="mt-1 truncate text-xs text-slate-500">{item.shop.description || item.shop.address || "Serviços de beleza"}</p>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-amber-600"><Star className="h-3 w-3 fill-current" /> Novo</span>
          {distance && <span>• {distance}</span>}
          <span className="flex items-center gap-1 text-emerald-600"><Clock3 className="h-3 w-3" /> Disponível</span>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  );
}
