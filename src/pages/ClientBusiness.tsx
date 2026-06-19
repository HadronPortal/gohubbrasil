import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Clock3, Heart, MapPin, Share2, Sparkles, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ClientBottomNav } from "@/components/client/ClientBottomNav";
import { getCategoryBySlug } from "@/lib/clientCategories";
import { getServiceVisual } from "@/lib/serviceVisuals";
import "@/lib/serviceIcons";

type Shop = {
  id: string;
  name: string;
  address: string | null;
  logo_url: string | null;
  description: string | null;
};

type Service = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration?: number | null;
  duration_minutes?: number | null;
  icon_key?: string | null;
  catalog_service_id?: string | null;
  service_catalog?: { icon_key: string | null; slug: string | null; name: string | null } | null;
};

export default function ClientBusiness() {
  const { shopId = "" } = useParams<{ shopId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const category = getCategoryBySlug(params.get("category") || "barbearias") || getCategoryBySlug("todos")!;
  const [shop, setShop] = useState<Shop | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: shops, error: shopError }, { data: serviceData, error: serviceError }] = await Promise.all([
        supabase.rpc("get_available_barbershops"),
        supabase
          .from("services")
          .select("*, service_catalog:catalog_service_id(icon_key,slug,name)")
          .eq("barbershop_id", shopId),
      ]);
      if (!active) return;
      if (shopError || serviceError) {
        console.error(shopError || serviceError);
        toast.error("Não foi possível carregar este estabelecimento.");
      }
      setShop(((shops || []) as Shop[]).find((item) => item.id === shopId) || null);
      setServices(((serviceData || []) as unknown as Service[]).map((item: any) => ({
        ...item,
        price: Number(item.price) || 0,
        service_catalog: Array.isArray(item.service_catalog) ? item.service_catalog[0] || null : item.service_catalog,
      })));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [shopId]);

  const sortedServices = useMemo(
    () => [...services].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [services]
  );

  const startBooking = async (serviceId?: string) => {
    if (!shop) return;
    const { error } = await supabase.rpc("set_my_selected_barbershop", { p_barbershop_id: shop.id });
    if (error) console.error("Não foi possível persistir o estabelecimento:", error);
    localStorage.setItem("selectedBarbershopId", shop.id);
    const suffix = serviceId ? `&serviceId=${serviceId}` : "";
    navigate(`/barbers?barbershopId=${shop.id}${suffix}`);
  };

  if (loading) return <LoadingScreen />;
  if (!shop) {
    return (
      <div className="gohub-client flex min-h-screen items-center justify-center bg-[#F6F7FB] p-6 text-center">
        <div>
          <p className="font-bold text-[#172033]">Estabelecimento não encontrado</p>
          <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sm font-semibold text-[#3157D5]">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="gohub-client min-h-screen bg-[#F6F7FB] pb-28 text-[#172033]">
      <div className="mx-auto max-w-md">
        <section className="relative h-56 overflow-hidden bg-slate-200" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          {shop.logo_url ? (
            <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center" style={{ backgroundColor: category.soft }}>
              <img src={category.image} alt="" className="h-40 w-40 object-contain drop-shadow-xl" />
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)" }}>
            <button type="button" onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow" aria-label="Voltar"><ArrowLeft className="h-5 w-5" /></button>
            <div className="flex gap-2">
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow" aria-label="Favoritar"><Heart className="h-5 w-5" /></button>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 shadow" aria-label="Compartilhar"><Share2 className="h-5 w-5" /></button>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-5 py-5">
          <p className="text-xs font-bold" style={{ color: category.accent }}>{category.label}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight">{shop.name}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{shop.description || "Profissionais preparados para cuidar de você."}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-semibold text-amber-600"><Star className="h-4 w-4 fill-current" /> Novo</span>
            <span className="flex items-center gap-1"><Clock3 className="h-4 w-4 text-emerald-600" /> Aberto para agendamentos</span>
            {shop.address && <span className="flex min-w-0 items-center gap-1"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{shop.address}</span></span>}
          </div>
        </section>

        <section className="px-4 py-6">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase text-slate-400">Escolha o que precisa</p>
              <h2 className="mt-1 text-xl font-extrabold">Serviços</h2>
            </div>
            <span className="text-xs text-slate-500">{services.length} opções</span>
          </div>

          {services.length === 0 ? (
            <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-8 text-center">
              <Sparkles className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold">Serviços em atualização</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
              {sortedServices.map((service, index) => (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => startBooking(service.id)}
                        className={`flex w-full items-center gap-3 p-4 text-left transition active:bg-slate-50 ${index ? "border-t border-slate-100" : ""}`}
                      >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[8px] bg-slate-50">
                          <img
                            src={getServiceVisual({
                              name: service.name,
                              serviceIconKey: service.icon_key,
                              catalogIconKey: service.service_catalog?.icon_key,
                              catalogSlug: service.service_catalog?.slug,
                              categorySlug: category.id,
                            }).image}
                            alt=""
                            loading="lazy"
                            width={48}
                            height={48}
                            className="h-12 w-12 object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold">{service.name}</p>
                          {service.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{service.description}</p>}
                          <p className="mt-2 text-xs text-slate-500">{service.duration_minutes || service.duration || 30} min</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold">R$ {service.price.toFixed(2).replace(".", ",")}</p>
                          <span className="mt-2 inline-flex h-8 items-center rounded-[6px] px-3 text-xs font-bold text-white" style={{ backgroundColor: category.accent }}>Agendar</span>
                        </div>
                      </button>
              ))}
            </div>
          )}
        </section>
      </div>
      <ClientBottomNav />
    </div>
  );
}
