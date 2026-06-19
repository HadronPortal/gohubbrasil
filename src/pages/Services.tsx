import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ClientFlowLayout } from "@/components/client/ClientFlowLayout";
import { getServiceVisual } from "@/lib/serviceVisuals";
import "@/lib/serviceIcons"; // registers icon_key → image map for resolver

type Service = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  duration_minutes: number;
  icon_key?: string | null;
  catalog_service_id?: string | null;
  service_catalog?: { icon_key: string | null; slug: string | null } | null;
};

export default function Services() {
  const [params] = useSearchParams();
  const barberId = params.get("barberId");
  const barbershopId = params.get("barbershopId");
  const requestedService = params.get("serviceId");
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [shopName, setShopName] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(requestedService);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.role !== "client") {
      navigate(profile.isSuperAdmin ? "/super-admin" : "/admin", { replace: true });
      return;
    }
    if (!barberId || !barbershopId) return void navigate("/client-home", { replace: true });
    let active = true;
    (async () => {
      const [{ data: serviceData, error }, { data: shop }] = await Promise.all([
        supabase
          .from("services")
          .select("id,name,description,price,duration_minutes,icon_key,catalog_service_id,service_catalog:catalog_service_id(icon_key,slug)")
          .eq("barbershop_id", barbershopId),
        supabase.from("barbershops").select("name").eq("id", barbershopId).single(),
      ]);
      if (!active) return;
      if (error) toast.error("Não foi possível carregar os serviços.");
      setServices(((serviceData || []) as unknown as Service[]).map((item: any) => ({
        ...item,
        price: Number(item.price) || 0,
        service_catalog: Array.isArray(item.service_catalog) ? item.service_catalog[0] || null : item.service_catalog,
      })));
      setShopName(shop?.name || "Estabelecimento GoHub");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [barberId, barbershopId, navigate, profile]);

  const continueFlow = () => {
    if (!selectedId) return void toast.error("Escolha um serviço para continuar.");
    navigate(`/booking/${barbershopId}?serviceId=${selectedId}&barberId=${barberId}`);
  };

  if (loading) return <LoadingScreen />;

  return (
    <ClientFlowLayout
      title="Escolha o serviço"
      subtitle={shopName}
      footer={<button type="button" onClick={continueFlow} disabled={!selectedId} className="h-12 w-full rounded-[8px] bg-[#3157D5] text-sm font-bold text-white transition disabled:opacity-40">Continuar</button>}
    >
      <div className="mb-5 rounded-[8px] bg-[#EAF0FF] p-4"><p className="text-xs font-bold text-[#3157D5]">Cuidado do seu jeito</p><p className="mt-1 text-sm text-slate-600">Escolha uma opção e veja os horários disponíveis.</p></div>
      <div className="space-y-3">
        {services.map((service) => {
          const selected = selectedId === service.id;
          return (
            <button key={service.id} type="button" onClick={() => setSelectedId(service.id)} className={`flex w-full items-center gap-3 rounded-[8px] border bg-white p-4 text-left transition active:scale-[0.99] ${selected ? "border-[#3157D5] ring-2 ring-[#3157D5]/15" : "border-slate-200"}`}>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[8px] bg-slate-50">
                <img
                  src={getServiceVisual({
                    name: service.name,
                    serviceIconKey: service.icon_key,
                    catalogIconKey: service.service_catalog?.icon_key,
                    catalogSlug: service.service_catalog?.slug,
                  }).image}
                  alt=""
                  loading="lazy"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold">{service.name}</span>
                {service.description && <span className="mt-1 line-clamp-1 block text-xs text-slate-500">{service.description}</span>}
                <span className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{service.duration_minutes || 30} min</span>
              </span>
              <span className="text-right"><span className="block text-sm font-extrabold">R$ {service.price.toFixed(2).replace(".", ",")}</span>{selected && <span className="mt-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#3157D5] text-white"><Check className="h-4 w-4" /></span>}</span>
            </button>
          );
        })}
      </div>
    </ClientFlowLayout>
  );
}
