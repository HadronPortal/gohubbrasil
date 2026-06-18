import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { UserAvatar } from "@/components/UserAvatar";
import { ClientFlowLayout } from "@/components/client/ClientFlowLayout";

type Professional = {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  avatar_url?: string;
};

export default function SelectBarber() {
  const [params] = useSearchParams();
  const barbershopId = params.get("barbershopId");
  const serviceId = params.get("serviceId");
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [shop, setShop] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return void navigate("/login", { replace: true });
    if (profile && profile.role !== "client") {
      navigate(profile.isSuperAdmin ? "/super-admin" : "/admin", { replace: true });
      return;
    }
    if (!barbershopId) return void navigate("/client-home", { replace: true });

    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: shopData }, { data: barberData, error: barberError }] = await Promise.all([
        supabase.from("barbershops").select("name,logo_url").eq("id", barbershopId).single(),
        supabase.from("barbers").select("id,user_id,bio,active").eq("barbershop_id", barbershopId).eq("active", true),
      ]);
      if (!active) return;
      if (barberError) {
        toast.error("Não foi possível carregar os profissionais.");
        setLoading(false);
        return;
      }
      const entries = barberData || [];
      const userIds = entries.map((item) => item.user_id).filter(Boolean);
      const { data: users, error: usersError } = userIds.length
        ? await supabase.from("users").select("id,name,avatar_url").in("id", userIds)
        : { data: [], error: null };
      if (!active) return;
      if (usersError) toast.error("Não foi possível carregar os perfis.");
      setShop(shopData);
      setProfessionals(entries.flatMap((entry) => {
        const person = users?.find((item) => item.id === entry.user_id);
        return person ? [{ id: entry.id, user_id: entry.user_id, name: person.name, avatar_url: person.avatar_url || undefined, bio: entry.bio || "Profissional GoHub" }] : [];
      }));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [authLoading, barbershopId, navigate, profile, user]);

  const continueFlow = () => {
    if (!selectedId) return void toast.error("Escolha um profissional para continuar.");
    if (serviceId) {
      navigate(`/booking/${barbershopId}?serviceId=${serviceId}&barberId=${selectedId}`);
      return;
    }
    navigate(`/services?barberId=${selectedId}&barbershopId=${barbershopId}`);
  };

  if (loading || authLoading) return <LoadingScreen />;

  return (
    <ClientFlowLayout
      title="Escolha o profissional"
      subtitle={shop?.name || "Atendimento GoHub"}
      footer={<button type="button" onClick={continueFlow} disabled={!selectedId} className="h-12 w-full rounded-[8px] bg-[#3157D5] text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-40">Continuar</button>}
    >
      {shop && (
        <div className="mb-6 flex items-center gap-3 rounded-[8px] border border-slate-200 bg-white p-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#EAF0FF]">
            {shop.logo_url ? <img src={shop.logo_url} alt="" className="h-full w-full object-cover" /> : <Sparkles className="h-5 w-5 text-[#3157D5]" />}
          </div>
          <div className="min-w-0"><p className="text-xs text-slate-500">Você está agendando em</p><p className="truncate text-sm font-bold">{shop.name}</p></div>
        </div>
      )}

      <p className="mb-3 text-xs font-bold uppercase text-slate-400">Profissionais disponíveis</p>
      {professionals.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-slate-300 bg-white p-8 text-center"><UserRound className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-semibold">Nenhum profissional disponível</p></div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {professionals.map((professional) => {
            const selected = selectedId === professional.id;
            return (
              <button key={professional.id} type="button" onClick={() => setSelectedId(professional.id)} className={`relative flex min-h-48 flex-col items-center rounded-[8px] border bg-white p-4 text-center transition active:scale-[0.99] ${selected ? "border-[#3157D5] ring-2 ring-[#3157D5]/15" : "border-slate-200"}`}>
                {selected && <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-[#3157D5] text-white"><Check className="h-4 w-4" /></span>}
                <UserAvatar name={professional.name} avatarUrl={professional.avatar_url} size="lg" className="h-20 w-20 border-2 border-white bg-[#EAF0FF] text-[#3157D5] shadow" />
                <h2 className="mt-4 line-clamp-2 text-sm font-extrabold">{professional.name}</h2>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{professional.bio}</p>
              </button>
            );
          })}
        </div>
      )}
    </ClientFlowLayout>
  );
}
