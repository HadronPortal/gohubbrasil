import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
import { getServiceDisplayName, getServiceVisual, normalizeName } from "@/lib/serviceVisuals";
import "@/lib/serviceIcons"; // registers icon_key → image map used by getServiceVisual
import petProdRacoes from "@/assets/services/pet/produto-racoes.png";
import petProdPetiscos from "@/assets/services/pet/produto-petiscos.png";
import petProdHigiene from "@/assets/services/pet/produto-higiene.png";
import petProdBrinquedos from "@/assets/services/pet/produto-brinquedos.png";
import petProdAcessorios from "@/assets/services/pet/produto-acessorios.png";
import petHeroImage from "@/assets/banners/banner-pet.jpg";
import { RobustusCarousel } from "@/components/client/RobustusCarousel";

// Tipos comerciais Pet: exibem estabelecimentos sem fluxo de agendamento.
const PET_STORE_TYPES = ["Pet shop", "Rações e acessórios"] as const;
type PetStoreType = (typeof PET_STORE_TYPES)[number];

const PET_PRODUCT_FILTERS: { label: PetProductFilter; image: string }[] = [
  { label: "Rações", image: petProdRacoes },
  { label: "Petiscos", image: petProdPetiscos },
  { label: "Higiene", image: petProdHigiene },
  { label: "Brinquedos", image: petProdBrinquedos },
  { label: "Acessórios", image: petProdAcessorios },
];
type PetProductFilter = "Rações" | "Petiscos" | "Higiene" | "Brinquedos" | "Acessórios";

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
  pet_types?: string[] | null;
};

type Service = { barbershop_id: string; name: string; price: number };
type BusinessCategoryRow = { id: string; name: string; slug: string };
type CatalogItem = {
  id: string;
  name: string;
  slug: string;
  icon_key: string | null;
  custom?: boolean;
};
type CatalogQueryData = { items: CatalogItem[]; supplementalError: string | null };

// Slugs comerciais que pertencem ao seletor "Comprar para o pet"
// e NÃO devem aparecer na lista de serviços agendáveis.
const PET_STORE_CATALOG_SLUGS = new Set(["pet-shop", "racoes-e-acessorios"]);

function slugifyServiceName(name: string): string {
  return normalizeName(name).replace(/\s+/g, "-");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return String(error);
}
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
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogItem | null>(null);
  const [selectedPetType, setSelectedPetType] = useState<PetStoreType | null>(null);
  const [selectedProductFilter, setSelectedProductFilter] = useState<PetProductFilter | null>(null);
  const selectedCatalogId = selectedCatalog?.id ?? null;
  const selectedCatalogSlug = selectedCatalog?.slug ?? null;
  const selectedCatalogIsCustom = Boolean(selectedCatalog?.custom);
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

  const businessCategoryQuery = useQuery<BusinessCategoryRow, Error>({
    queryKey: ["business-category", categorySlug],
    enabled: category.id !== "todos",
    gcTime: 0,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_categories")
        .select("id,name,slug")
        .eq("slug", categorySlug)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error(`Categoria não encontrada: ${categorySlug}`);

      return data as BusinessCategoryRow;
    },
  });

  const categoryId = businessCategoryQuery.data?.id ?? null;

  const serviceCatalogQuery = useQuery<CatalogQueryData, Error>({
    queryKey: ["service-catalog", categorySlug, categoryId],
    enabled: category.id !== "todos" && Boolean(categoryId),
    gcTime: 0,
    retry: 1,
    queryFn: async () => {
      if (!categoryId) return { items: [], supplementalError: null };

      const { data, error } = await supabase
        .from("service_catalog")
        .select("id,name,slug,icon_key")
        .eq("category_id", categoryId)
        .eq("active", true)
        .order("name");

      if (error) throw new Error(error.message);

      const items = ((data || []) as CatalogItem[]).filter(
        (item) => !(categorySlug === "pet" && PET_STORE_CATALOG_SLUGS.has(item.slug)),
      );
      const knownSlugs = new Set(items.map((item) => slugifyServiceName(item.slug || item.name)));
      let supplementalError: string | null = null;

      try {
        const { data: categoryShops, error: shopsError } = await supabase
          .from("barbershops")
          .select("id")
          .eq("category_id", categoryId);

        if (shopsError) throw shopsError;

        const shopIds = (categoryShops || []).map((shop: { id: string }) => shop.id);
        if (shopIds.length > 0) {
          const { data: customServices, error: servicesError } = await supabase
            .from("services")
            .select("name,catalog_service_id")
            .in("barbershop_id", shopIds)
            .is("catalog_service_id", null);

          if (servicesError) throw servicesError;

          for (const service of (customServices || []) as { name: string }[]) {
            const slug = slugifyServiceName(service.name);
            if (!slug || knownSlugs.has(slug)) continue;
            if (categorySlug === "pet" && PET_STORE_CATALOG_SLUGS.has(slug)) continue;
            knownSlugs.add(slug);
            items.push({
              id: `custom:${slug}`,
              name: service.name.trim(),
              slug,
              icon_key: null,
              custom: true,
            });
          }
        }
      } catch (error) {
        supplementalError = getErrorMessage(error);
        console.error("Erro ao carregar serviços personalizados:", error);
      }

      return {
        items: items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
        supplementalError,
      };
    },
  });

  const catalog = serviceCatalogQuery.data?.items ?? [];
  const catalogErrorMessage =
    businessCategoryQuery.error?.message || serviceCatalogQuery.error?.message || serviceCatalogQuery.data?.supplementalError || null;

  useEffect(() => {
    if (!authLoading && !user) navigate("/login", { replace: true });
  }, [authLoading, navigate, user]);

  useEffect(() => {
    setSelectedCatalog(null);
    setSelectedPetType(null);
    setSelectedProductFilter(null);
    setQuery("");
  }, [categorySlug]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const catalogIdForRpc =
        selectedCatalogId && !selectedCatalogIsCustom ? selectedCatalogId : null;
      const [{ data: shopData, error: shopError }, { data: serviceData, error: serviceError }] =
        await Promise.all([
          supabase.rpc("get_barbershops_by_category_service", {
            p_category_slug: category.id,
            p_catalog_service_id: catalogIdForRpc,
            p_pet_type: selectedPetType ?? null,
          }),
          supabase.from("services").select("barbershop_id,name,price"),
        ]);
      if (!active) return;
      if (shopError) {
        console.error("Erro ao carregar estabelecimentos:", shopError);
      }
      if (serviceError) {
        console.error("Erro ao carregar serviços:", serviceError);
      }
      const allServices = (serviceData || []) as Service[];
      let resultShops = (shopData || []) as Shop[];
      // Para serviços personalizados (sem id no catálogo), filtrar shops client-side
      // pelo slug normalizado do nome do serviço.
      if (selectedCatalogIsCustom && selectedCatalogSlug) {
        const target = selectedCatalogSlug;
        const matchingShopIds = new Set(
          allServices
            .filter((s) => slugifyServiceName(s.name) === target)
            .map((s) => s.barbershop_id),
        );
        resultShops = resultShops.filter((s) => matchingShopIds.has(s.id));
      }
      setShops(resultShops);
      setServices(allServices);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user, category.id, selectedCatalogId, selectedCatalogIsCustom, selectedCatalogSlug, selectedPetType]);

  const stores = useMemo(() => {
    const grouped = new Map<string, Service[]>();
    services.forEach((service) => {
      const current = grouped.get(service.barbershop_id) || [];
      current.push({ ...service, price: Number(service.price) || 0 });
      grouped.set(service.barbershop_id, current);
    });

    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const normalizedProductFilter = selectedProductFilter
      ? normalizeName(selectedProductFilter)
      : "";
    const lat = location?.latitude;
    const lon = location?.longitude;

    const enriched = shops
      .map((shop) => {
        const shopServices = grouped.get(shop.id) || [];
        const content = [shop.name, shop.description, ...shopServices.map((item) => item.name)]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR");
        const matchesSearch = !normalizedQuery || content.includes(normalizedQuery);
        const matchesProductFilter =
          !normalizedProductFilter ||
          normalizeName(content).includes(normalizedProductFilter) ||
          normalizeName(shop.name || "").includes(normalizedProductFilter);
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
        const hasBookableService = shopServices.length > 0;
        const ratingScore =
          typeof (shop as Shop & { rating?: unknown }).rating === "number"
            ? Number((shop as Shop & { rating: number }).rating)
            : (shop.logo_url ? 4.8 : 4.5) + (shop.description ? 0.1 : 0);
        return {
          shop,
          services: shopServices,
          minPrice,
          distance,
          matchesSearch,
          matchesProductFilter,
          hasBookableService,
          ratingScore,
        };
      })
      .filter((item) => item.matchesSearch && item.matchesProductFilter);
    const result = filters.includes("today") && !selectedPetType
      ? enriched.filter((item) => item.matchesSearch && item.matchesProductFilter && item.hasBookableService)
      : enriched;

    return result.sort((a, b) => {
      if (filters.includes("distance")) {
        const da = a.distance ?? Number.POSITIVE_INFINITY;
        const db = b.distance ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      if (filters.includes("rating") && a.ratingScore !== b.ratingScore) {
        return b.ratingScore - a.ratingScore;
      }
      if (filters.includes("price") && (a.minPrice ?? Infinity) !== (b.minPrice ?? Infinity)) {
        return (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity);
      }
      return a.shop.name.localeCompare(b.shop.name, "pt-BR");
    });
  }, [filters, location, query, selectedPetType, selectedProductFilter, services, shops]);

  const toggleFilter = (key: FilterKey) =>
    setFilters((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));

  const openShop = (shopId: string) => {
    const mode = selectedPetType ? "&mode=store" : "";
    navigate(`/client-business/${shopId}?category=${category.id}${mode}`);
  };

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
                  style={selected ? { backgroundColor: "#3157D5" } : undefined}
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
            {category.id === "pet" ? (
              <div
                className="relative w-full overflow-hidden rounded-[8px]"
                style={{ height: "clamp(180px, 52vw, 210px)", backgroundColor: category.soft }}
              >
                <img
                  src={petHeroImage}
                  alt="Pet — cuidados, produtos e profissionais"
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
                <div className="relative z-10 flex h-full max-w-[62%] flex-col justify-center px-4 py-4 sm:px-5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-white/85">
                    {category.eyebrow}
                  </p>
                  <h1 className="mt-1 text-[18px] font-extrabold leading-tight text-white drop-shadow-sm sm:text-[20px]">
                    Tudo para o seu pet em um só lugar
                  </h1>
                  <p className="mt-1.5 text-[11px] leading-snug text-white/90 sm:text-xs">
                    Encontre cuidados, produtos e profissionais perto de você.
                  </p>
                </div>
              </div>
            ) : (
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
            )}
          </section>

          {category.id === "pet" && (
            <section className="pt-4">
              <RobustusCarousel />
            </section>
          )}

          {category.id === "pet" && (
            <section className="pt-5">
              <div className="mb-2 px-4">
                <p className="text-[11px] font-bold uppercase text-slate-400">Lojas e produtos</p>
                <h2 className="mt-1 text-base font-extrabold">Comprar para o pet</h2>
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1">
                {PET_STORE_TYPES.map((type) => {
                  const selected = selectedPetType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSelectedPetType(selected ? null : type);
                        setSelectedCatalog(null);
                        setSelectedProductFilter(null);
                      }}
                      className={`h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition ${
                        selected
                          ? "border-transparent text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                      style={selected ? { backgroundColor: "#3157D5" } : undefined}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 px-4 text-[11px] text-slate-500">
                Estabelecimentos comerciais — sem agendamento online.
              </p>
            </section>
          )}

          {category.id === "pet" && (selectedPetType === "Rações e acessórios" || selectedPetType === "Pet shop") && (
            <section className="pt-6">
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-lg font-extrabold">Explore produtos</h2>
                {selectedProductFilter && (
                  <button
                    type="button"
                    onClick={() => setSelectedProductFilter(null)}
                    className="text-xs font-semibold text-[#3157D5]"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div
                className="no-scrollbar flex items-start gap-3 overflow-x-auto px-4 py-1 pb-3"
                style={{ scrollPaddingInline: 16, scrollSnapType: "x proximity" }}
              >
                {PET_PRODUCT_FILTERS.map((filter) => {
                  const selected = selectedProductFilter === filter.label;
                  return (
                    <button
                      key={filter.label}
                      type="button"
                      onClick={() =>
                        setSelectedProductFilter(selected ? null : filter.label)
                      }
                      className="grid w-[88px] shrink-0 grid-rows-[64px_40px] gap-2 text-center active:scale-95"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[8px] border bg-white ${
                          selected ? "border-[#3157D5] ring-2 ring-[#3157D5]/20 ring-offset-2 ring-offset-[#F7F9FC]" : "border-slate-100"
                        }`}
                      >
                        <img
                          src={filter.image}
                          alt=""
                          loading="lazy"
                          width={48}
                          height={48}
                          className="h-12 w-12 object-contain"
                        />
                      </div>
                      <span className="mx-auto flex h-10 w-full items-start justify-center overflow-hidden px-0.5 text-center text-[11px] font-semibold leading-[14px] text-slate-700 line-clamp-2 break-words">
                        {filter.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {catalogErrorMessage && selectedPetType !== "Rações e acessórios" && (
            <section className="px-4 pt-4">
              <div className="rounded-[8px] border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                {catalogErrorMessage}
              </div>
            </section>
          )}

          {catalog.length > 0 && selectedPetType !== "Rações e acessórios" && (
            <section className="pt-6">
              <div className="mb-3 flex items-center justify-between px-4">
                <h2 className="text-lg font-extrabold">
                  {category.id === "pet" && selectedPetType === "Pet shop" ? "Serviços disponíveis" : "Explore serviços"}
                </h2>
                {selectedCatalog && (
                  <button type="button" onClick={() => setSelectedCatalog(null)} className="text-xs font-semibold text-[#3157D5]">
                    Limpar
                  </button>
                )}
              </div>
              <div
                className="no-scrollbar flex items-start gap-3 overflow-x-auto px-4 py-1 pb-3"
                style={{ scrollPaddingInline: 16, scrollSnapType: "x proximity" }}
              >
                {catalog.map((item) => {
                  const selected = selectedCatalog?.id === item.id;
                  const displayName = getServiceDisplayName(item.name, item.slug);
                  const visual = getServiceVisual({
                    name: displayName,
                    catalogIconKey: item.icon_key,
                    catalogSlug: item.slug,
                    categorySlug: category.id,
                  });
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedCatalog(selected ? null : item);
                        setSelectedPetType(null);
                      }}
                      className="grid w-[88px] shrink-0 grid-rows-[64px_40px] gap-2 text-center active:scale-95"
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div
                        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[8px] border bg-white ${
                          selected ? "border-[#3157D5] ring-2 ring-[#3157D5]/20 ring-offset-2 ring-offset-[#F7F9FC]" : "border-slate-100"
                        }`}
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
                      <span className="mx-auto flex h-10 w-full items-start justify-center overflow-hidden px-0.5 text-center text-[11px] font-semibold leading-[14px] text-slate-700 line-clamp-2 break-words">
                        {displayName}
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
              {(selectedPetType === "Rações e acessórios"
                ? ([
                    { key: "distance", label: "Mais próximos" },
                    { key: "today", label: "Aberto agora" },
                    { key: "rating", label: "Melhor avaliados" },
                  ] as { key: FilterKey; label: string }[])
                : FILTERS
              ).map((filter) => {
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
                  <p className="mt-3 text-sm font-semibold">
                    {selectedCatalog
                      ? "Nenhum estabelecimento oferece este serviço no momento."
                      : "Nenhum estabelecimento encontrado"}
                  </p>
                  {!selectedCatalog && (
                    <p className="mt-1 text-xs text-slate-500">Tente outra categoria ou remova os filtros.</p>
                  )}
                  {selectedCatalog ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCatalog(null)}
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#3157D5] px-4 text-xs font-semibold text-white"
                    >
                      Limpar serviço
                    </button>
                  ) : category.id !== "todos" && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setSelectedCatalog(null);
                        setFilters([]);
                        navigate("/client-category/todos");
                      }}
                      className="mt-4 inline-flex h-10 items-center justify-center rounded-[8px] bg-[#3157D5] px-4 text-xs font-semibold text-white"
                    >
                      Ver todos os estabelecimentos
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pl-7 pr-5 pb-3">
                {stores.slice(0, 8).map((item, index) => (
                  <div key={item.shop.id} className="snap-start first:ml-1">
                    <FeaturedStore
                      item={item}
                      categoryLabel={category.label}
                      accent={category.accent}
                      index={index}
                      onClick={() => openShop(item.shop.id)}
                    />
                  </div>
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
          <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#3157D5]"><Star className="h-3.5 w-3.5 fill-current" /> Novo</span>
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
          <span className="flex items-center gap-1 text-[#3157D5]"><Star className="h-3 w-3 fill-current" /> Novo</span>
          {distance && <span>• {distance}</span>}
          <span className="flex items-center gap-1 text-emerald-600"><Clock3 className="h-3 w-3" /> Disponível</span>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  );
}
