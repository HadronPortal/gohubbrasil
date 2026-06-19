import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Bell,
  Building2,
  CheckCircle,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Store,
  Trash2,
  Unlock,
  Upload,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { money } from "@/utils/format";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileModal } from "@/components/ProfileModal";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ESTABLISHMENT_CATEGORIES,
  getCategoryMeta,
  displayCategoryName,
} from "@/lib/establishmentCategories";
import { AddressFields, AddressData, emptyAddress, composeAddress } from "@/components/admin/AddressFields";
import gohubLogo from "@/assets/login/gohub-logo.png";

interface Barbershop {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  payment_status: string | null;
  subscription_status: string | null;
  monthly_price: number | null;
  paid_until: string | null;
  blocked: boolean;
  created_at?: string | null;
  category_id?: string | null;
  owner?: { name: string; phone?: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  trialing: "Período de teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};

const parseCurrency = (value: string): number => {
  if (!value) return 0;
  const clean = value
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return parseFloat(clean) || 0;
};

const fmtBRL = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
};

const resolveStatus = (shop: Barbershop): string => {
  if (shop.blocked) return "blocked";
  return shop.subscription_status || "trialing";
};

function StatusBadge({ shop }: { shop: Barbershop }) {
  const status = resolveStatus(shop);
  const styles: Record<string, string> = {
    active: "bg-[#E7F7EE] text-[#15803D]",
    trialing: "bg-[#E8EEFD] text-[#3157D5]",
    past_due: "bg-[#FEF3E2] text-[#B45309]",
    blocked: "bg-[#FDECEC] text-[#B91C1C]",
    cancelled: "bg-[#EEF1F6] text-[#475569]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        styles[status] || styles.cancelled,
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[8px] border border-[#DDE3EE] bg-white px-4 py-3">
      <span
        className="h-9 w-1 flex-shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-[#64748B]">{label}</p>
        <p className="truncate text-lg font-semibold text-[#172033]">{value}</p>
      </div>
    </div>
  );
}

const inputClass =
  "h-11 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] placeholder:text-[#94A3B8] focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0";

const labelClass = "text-xs font-medium text-[#172033]";

export default function SuperAdmin() {
  const { user, profile, isSuperAdmin, loading: authLoading } = useAuth();
  const [barbershops, setBarbershops] = useState<Barbershop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile / logout
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  // Create
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [createMonthlyPrice, setCreateMonthlyPrice] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState<string>("");
  const [createAddress, setCreateAddress] = useState<AddressData>(emptyAddress);
  const [ownerIsBarber, setOwnerIsBarber] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit
  const [editingBarbershop, setEditingBarbershop] = useState<Barbershop | null>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editMonthlyPrice, setEditMonthlyPrice] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editAddress, setEditAddress] = useState<AddressData>(emptyAddress);

  // Delete
  const [deletingShop, setDeletingShop] = useState<Barbershop | null>(null);

  // Payment
  const [paymentModalShop, setPaymentModalShop] = useState<Barbershop | null>(null);
  const [paymentValue, setPaymentValue] = useState("");
  const [paidUntil, setPaidUntil] = useState("");

  // Block confirm
  const [blockingShop, setBlockingShop] = useState<Barbershop | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [blockedFilter, setBlockedFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "paid_until" | "created_at">("name");

  // Category catalog from DB (UUID is source of truth)
  type CategoryRow = { id: string; slug: string; name: string };
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const categoryIdToSlug = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => (m[c.id] = c.slug));
    return m;
  }, [categories]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchCategories();
      fetchBarbershops();
    }
  }, [isSuperAdmin]);

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    const { data, error } = await supabase
      .from("business_categories")
      .select("id, name, slug")
      .order("name");
    console.log("Categorias retornadas:", data);
    if (error) {
      console.error("Erro ao carregar categorias:", error);
      setCategoriesError(error.message || "Erro ao carregar categorias");
      setCategoriesLoading(false);
      return;
    }
    setCategories((data || []) as CategoryRow[]);
    setCategoriesLoading(false);
  };

  const fetchBarbershops = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data: shops, error } = await supabase
        .from("barbershops")
        .select(`*, users(name, phone, role)`)
        .order("name", { ascending: true });

      if (error) throw error;

      const formatted: Barbershop[] = (shops || []).map((shop: any) => {
        const ownerUser = shop.users?.find((u: any) => u.role === "owner") || shop.users?.[0];
        return {
          ...shop,
          owner: ownerUser ? { name: ownerUser.name, phone: ownerUser.phone } : null,
        };
      });

      setBarbershops(formatted);
    } catch (error: any) {
      console.error("Error fetching shops:", error);
      setLoadError(error?.message || "Erro ao carregar estabelecimentos");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = barbershops.filter((shop) => {
      if (q) {
        const haystack = [
          shop.name,
          shop.owner?.name,
          shop.phone,
          shop.owner?.phone,
          shop.address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (categoryFilter !== "all") {
        const slug = categoryIdToSlug[shop.category_id || ""] || "barbearias";
        if (slug !== categoryFilter) return false;
      }
      if (statusFilter !== "all" && resolveStatus(shop) !== statusFilter) return false;
      if (blockedFilter === "blocked" && !shop.blocked) return false;
      if (blockedFilter === "active" && shop.blocked) return false;
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "paid_until") {
        const da = a.paid_until ? new Date(a.paid_until).getTime() : Infinity;
        const db = b.paid_until ? new Date(b.paid_until).getTime() : Infinity;
        return da - db;
      }
      const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
      const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return cb - ca;
    });

    return list;
  }, [barbershops, search, categoryFilter, statusFilter, blockedFilter, sortBy, categoryIdToSlug]);

  // Summary
  const summary = useMemo(() => {
    let active = 0,
      trial = 0,
      pending = 0,
      blocked = 0,
      monthly = 0;
    barbershops.forEach((s) => {
      const st = resolveStatus(s);
      if (st === "active") active += 1;
      if (st === "trialing") trial += 1;
      if (st === "past_due") pending += 1;
      if (st === "blocked") blocked += 1;
      if (!s.blocked && s.subscription_status === "active")
        monthly += Number(s.monthly_price || 0);
    });
    return { active, trial, pending, blocked, monthly };
  }, [barbershops]);

  if (authLoading) return <LoadingState />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;

  // Handlers ------------------------------------------------------------
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isEdit) {
      setEditLogoFile(file);
      setEditLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async (file: File) => {
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("barbershops")
      .upload(path, file);
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage.from("barbershops").getPublicUrl(path);
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const paidUntilValue = formData.get("paid_until") as string;
    const monthlyPriceValue = parseCurrency(formData.get("monthly_price") as string);

    try {
      let logoUrl = "";
      if (logoFile) logoUrl = await uploadLogo(logoFile);

      let subscriptionStatus = (formData.get("subscription_status") as string) || "trialing";
      if (paidUntilValue) subscriptionStatus = "active";

      if (!createCategoryId) {
        toast.error("Selecione uma categoria.");
        setIsSubmitting(false);
        return;
      }

      const addressString = composeAddress(createAddress);

      const { data: response, error } = await supabase.functions.invoke(
        "create-barbershop-with-owner",
        {
          body: {
            barbershopName: formData.get("barbershop_name") as string,
            barbershopAddress: addressString,
            barbershopPhone: formData.get("barbershop_phone") as string,
            logoUrl,
            description: formData.get("description") as string,
            subscriptionStatus,
            monthlyPrice: monthlyPriceValue,
            paidUntil: paidUntilValue,
            ownerName: formData.get("owner_name") as string,
            ownerEmail: formData.get("owner_email") as string,
            ownerPhone: formData.get("owner_phone") as string,
            ownerPassword: formData.get("owner_password") as string,
            ownerIsBarber: Boolean(ownerIsBarber),
            categoryId: createCategoryId,
          },
        },
      );

      if (error) {
        toast.error(error.message || "Erro de conexão com o servidor.");
        return;
      }
      if (response && response.success === false) {
        toast.error(response.error || "Erro ao cadastrar estabelecimento.");
        return;
      }

      toast.success("Estabelecimento cadastrado com sucesso");
      setIsCreateModalOpen(false);
      (e.target as HTMLFormElement).reset();
      setLogoFile(null);
      setLogoPreview(null);
      setOwnerIsBarber(false);
      setCreateMonthlyPrice("");
      setCreateCategoryId("");
      setCreateAddress(emptyAddress);
      fetchBarbershops();
    } catch (error: any) {
      toast.error(error.message || "Erro inesperado ao cadastrar estabelecimento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBarbershop) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const paidUntilValue = formData.get("paid_until") as string;
    const monthlyPriceValue = parseCurrency(formData.get("monthly_price") as string);
    let subscriptionStatus = formData.get("subscription_status") as string;
    let blocked = editingBarbershop.blocked;

    if (paidUntilValue) {
      const paidUntilDate = new Date(paidUntilValue);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (paidUntilDate >= now) {
        subscriptionStatus = "active";
        blocked = false;
      }
    }

    try {
      let logoUrl = editingBarbershop.logo_url;
      if (editLogoFile) logoUrl = await uploadLogo(editLogoFile);

      if (!editCategoryId) {
        toast.error("Selecione uma categoria.");
        setIsSubmitting(false);
        return;
      }

      const addressString = composeAddress(editAddress) || (editingBarbershop.address || "");

      const { error } = await supabase
        .from("barbershops")
        .update({
          name: formData.get("name") as string,
          address: addressString,
          phone: formData.get("phone") as string,
          description: formData.get("description") as string,
          subscription_status: subscriptionStatus,
          monthly_price: monthlyPriceValue,
          paid_until: paidUntilValue || null,
          blocked,
          logo_url: logoUrl,
          category_id: editCategoryId,
        })
        .eq("id", editingBarbershop.id);

      if (error) throw error;

      toast.success("Estabelecimento atualizado");
      setEditingBarbershop(null);
      setEditLogoFile(null);
      setEditLogoPreview(null);
      fetchBarbershops();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingShop) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("delete_barbershop_safe", {
        p_barbershop_id: deletingShop.id,
      });
      if (error) throw error;
      if (data && (data as any).success === false) {
        toast.error((data as any).error || "Erro ao excluir");
      } else {
        toast.success("Estabelecimento excluído");
        setBarbershops((prev) => prev.filter((s) => s.id !== deletingShop.id));
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir");
    } finally {
      setIsSubmitting(false);
      setDeletingShop(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!paymentModalShop || !paidUntil) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc("mark_barbershop_paid", {
        p_barbershop_id: paymentModalShop.id,
        p_paid_until: paidUntil,
        p_amount: parseCurrency(paymentValue),
      });
      if (error) throw error;

      const newPrice = parseCurrency(paymentValue);
      setBarbershops((prev) =>
        prev.map((s) =>
          s.id === paymentModalShop.id
            ? {
                ...s,
                paid_until: paidUntil,
                subscription_status: "active",
                blocked: false,
                monthly_price: newPrice || s.monthly_price,
              }
            : s,
        ),
      );

      toast.success("Pagamento registrado");
      setPaymentModalShop(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar pagamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!blockingShop) return;
    setIsSubmitting(true);
    const newBlocked = !blockingShop.blocked;
    try {
      const { error } = await supabase
        .from("barbershops")
        .update({ blocked: newBlocked })
        .eq("id", blockingShop.id);
      if (error) throw error;
      setBarbershops((prev) =>
        prev.map((s) => (s.id === blockingShop.id ? { ...s, blocked: newBlocked } : s)),
      );
      toast.success(newBlocked ? "Estabelecimento bloqueado" : "Estabelecimento desbloqueado");
      setBlockingShop(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar bloqueio");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render --------------------------------------------------------------
  return (
    <div className="gohub-client min-h-[100dvh] bg-[#F6F7FB] text-[#172033]">
      {/* Header */}
      <header
        className="sticky top-0 z-30 border-b border-[#DDE3EE] bg-white/95 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <img src={gohubLogo} alt="GoHub" className="h-9 w-auto flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight text-[#172033]">
                Painel GoHub
              </h1>
              <p className="truncate text-xs text-[#64748B]">Gestão de estabelecimentos</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 md:justify-end md:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-[#64748B] hover:bg-[#EEF1F6] hover:text-[#172033]"
              aria-label="Notificações"
              title="Notificações"
            >
              <Bell className="h-5 w-5" />
            </Button>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="rounded-full outline-none ring-offset-2 transition-transform focus-visible:ring-2 focus-visible:ring-[#3157D5] active:scale-95"
              aria-label="Abrir perfil"
              title="Perfil"
            >
              <UserAvatar
                name={profile?.name}
                email={user?.email}
                avatarUrl={profile?.avatar_url}
                size="md"
                className="border border-[#DDE3EE] bg-white"
              />
            </button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="h-10 gap-2 rounded-[8px] bg-[#3157D5] px-4 text-sm font-semibold text-white hover:bg-[#274ac0] active:bg-[#1f3ea3]"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Cadastrar estabelecimento</span>
              <span className="sm:hidden">Cadastrar</span>
            </Button>
          </div>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-[1280px] space-y-6 px-4 py-6 md:px-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}
      >
        {/* Summary */}
        <section
          aria-label="Resumo geral"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
        >
          <StatPill label="Ativos" value={summary.active} accent="#16A34A" />
          <StatPill label="Em período de teste" value={summary.trial} accent="#3157D5" />
          <StatPill label="Pagamentos pendentes" value={summary.pending} accent="#F59E0B" />
          <StatPill label="Bloqueados" value={summary.blocked} accent="#DC2626" />
          <StatPill
            label="Receita mensal prevista"
            value={money(summary.monthly)}
            accent="#172033"
          />
        </section>

        {/* List */}
        <section className="rounded-[8px] border border-[#DDE3EE] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#DDE3EE] p-4 md:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#172033]">Estabelecimentos</h2>
              <span className="text-xs text-[#64748B]">
                {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
              <div className="relative md:col-span-4">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, proprietário, telefone ou cidade"
                  className={cn(inputClass, "pl-9")}
                />
              </div>
              <div className="md:col-span-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="all">Todas as categorias</SelectItem>
                    {ESTABLISHMENT_CATEGORIES.map((c) => (
                      <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" key={c.id} value={c.id}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Assinatura" />
                  </SelectTrigger>
                  <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="all">Todas as assinaturas</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Select value={blockedFilter} onValueChange={setBlockedFilter}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Bloqueio" />
                  </SelectTrigger>
                  <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="all">Todos</SelectItem>
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="active">Sem bloqueio</SelectItem>
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="blocked">Somente bloqueados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="name">Ordenar por nome</SelectItem>
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="paid_until">Ordenar por vencimento</SelectItem>
                    <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" value="created_at">Ordenar por cadastro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5">
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-56 animate-pulse rounded-[8px] border border-[#DDE3EE] bg-[#F1F4F9]"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <p className="text-sm text-[#64748B]">{loadError}</p>
                <Button
                  onClick={fetchBarbershops}
                  className="h-10 rounded-[8px] bg-[#3157D5] px-4 text-sm font-semibold text-white hover:bg-[#274ac0]"
                >
                  Tentar novamente
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF1F6]">
                  <Building2 className="h-6 w-6 text-[#64748B]" />
                </div>
                <p className="text-sm font-medium text-[#172033]">
                  Nenhum estabelecimento encontrado
                </p>
                <p className="text-xs text-[#64748B]">
                  Ajuste os filtros ou cadastre um novo estabelecimento.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((shop) => {
                  const cat = getCategoryMeta(categoryIdToSlug[shop.category_id || ""] || "barbearias");
                  return (
                    <article
                      key={shop.id}
                      className="flex flex-col rounded-[8px] border border-[#DDE3EE] bg-white p-4 transition-shadow hover:shadow-[0_6px_20px_-12px_rgba(15,23,42,0.15)]"
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-14 w-14 flex-shrink-0 rounded-[8px] border border-[#DDE3EE]">
                          <AvatarImage src={shop.logo_url || ""} className="object-cover" />
                          <AvatarFallback className="rounded-[8px] bg-[#F1F4F9]">
                            <Store className="h-5 w-5 text-[#94A3B8]" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="truncate text-base font-semibold leading-tight text-[#172033]">
                              {shop.name}
                            </h3>
                            <StatusBadge shop={shop} />
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#64748B]">
                            <img src={cat.image} alt="" className="h-4 w-4 object-contain" />
                            <span className="truncate">{cat.label}</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#64748B]">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{shop.owner?.name || "Sem proprietário"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs text-[#475569]">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#94A3B8]" />
                          <span className="line-clamp-2">{shop.address || "Sem endereço"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 flex-shrink-0 text-[#94A3B8]" />
                          <span className="truncate">
                            {shop.phone || shop.owner?.phone || "Sem telefone"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3 rounded-[8px] bg-[#F6F7FB] p-3 text-xs">
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
                            Mensalidade
                          </p>
                          <p className="font-semibold text-[#172033]">
                            {money(shop.monthly_price)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
                            Vencimento
                          </p>
                          <p className="font-semibold text-[#172033]">
                            {shop.paid_until
                              ? format(new Date(shop.paid_until), "dd/MM/yyyy")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
                            Cadastro
                          </p>
                          <p className="font-medium text-[#475569]">
                            {shop.created_at
                              ? format(new Date(shop.created_at), "dd/MM/yyyy")
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-medium uppercase tracking-wide text-[#94A3B8]">
                            Bloqueio
                          </p>
                          <p
                            className={cn(
                              "font-semibold",
                              shop.blocked ? "text-[#DC2626]" : "text-[#16A34A]",
                            )}
                          >
                            {shop.blocked ? "Bloqueado" : "Liberado"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#DDE3EE] pt-3">
                        <Button
                          onClick={() => {
                            setPaymentModalShop(shop);
                            setPaymentValue(fmtBRL(shop.monthly_price));
                            setPaidUntil(shop.paid_until || "");
                          }}
                          className="h-9 flex-1 gap-1.5 rounded-[8px] bg-[#16A34A] px-3 text-xs font-semibold text-white hover:bg-[#15803D] active:bg-[#166534]"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Marcar como pago
                        </Button>
                        <div className="flex items-center gap-1">
                          <IconAction
                            label="Editar"
                            onClick={() => {
                              setEditingBarbershop(shop);
                              setEditLogoPreview(shop.logo_url);
                              setEditMonthlyPrice(fmtBRL(shop.monthly_price));
                              setEditCategoryId(shop.category_id || "");
                              setEditAddress({ ...emptyAddress, street: shop.address || "" });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </IconAction>
                          <IconAction
                            label={shop.blocked ? "Desbloquear" : "Bloquear"}
                            onClick={() => setBlockingShop(shop)}
                          >
                            {shop.blocked ? (
                              <Unlock className="h-4 w-4" />
                            ) : (
                              <Lock className="h-4 w-4" />
                            )}
                          </IconAction>
                          <IconAction
                            label="Excluir"
                            danger
                            onClick={() => setDeletingShop(shop)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </IconAction>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Create Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-[8px] border-[#DDE3EE] bg-white text-[#172033]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#172033]">
              Novo estabelecimento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <SectionTitle>Dados do estabelecimento</SectionTitle>

                <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-[#DDE3EE] bg-[#F6F7FB] p-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative rounded-full"
                  >
                    <Avatar className="h-20 w-20 border border-[#DDE3EE]">
                      <AvatarImage src={logoPreview || ""} className="object-cover" />
                      <AvatarFallback className="bg-white">
                        <Store className="h-6 w-6 text-[#94A3B8]" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-[#172033]/40 opacity-0 transition-opacity group-hover:opacity-100">
                      <Upload className="h-4 w-4 text-white" />
                    </span>
                  </button>
                  <p className="text-[11px] text-[#64748B]">Logo do estabelecimento</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e)}
                  />
                </div>

                <Field label="Nome" htmlFor="barbershop_name">
                  <Input id="barbershop_name" name="barbershop_name" required className={inputClass} />
                </Field>

                <Field label="Categoria" htmlFor="category">
                  <Select value={createCategoryId} onValueChange={setCreateCategoryId}>
                    <SelectTrigger id="category" className={inputClass}>
                      <SelectValue placeholder={categoriesLoading ? "Carregando categorias..." : "Selecione uma categoria"} />
                    </SelectTrigger>
                    <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                      {categoriesLoading && (
                        <div className="px-3 py-2 text-xs text-[#64748B]">Carregando categorias...</div>
                      )}
                      {!categoriesLoading && categoriesError && (
                        <div className="px-3 py-2 text-xs text-[#B91C1C]">{categoriesError}</div>
                      )}
                      {!categoriesLoading && !categoriesError && categories.length === 0 && (
                        <div className="px-3 py-2 text-xs text-[#64748B]">Nenhuma categoria encontrada</div>
                      )}
                      {categories.map((c) => (
                        <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" key={c.id} value={c.id}>
                          {displayCategoryName(c.slug, c.name)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {categoriesError && (
                    <p className="mt-1 text-[11px] text-[#B91C1C]">{categoriesError}</p>
                  )}
                </Field>

                <AddressFields value={createAddress} onChange={setCreateAddress} idPrefix="create_addr" />

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone" htmlFor="barbershop_phone">
                    <Input id="barbershop_phone" name="barbershop_phone" required className={inputClass} />
                  </Field>
                  <Field label="Valor mensal" htmlFor="monthly_price">
                    <Input
                      id="monthly_price"
                      name="monthly_price"
                      type="text"
                      placeholder="R$ 0,00"
                      value={createMonthlyPrice}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setCreateMonthlyPrice(fmtBRL(v ? parseInt(v) / 100 : 0));
                      }}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Status da assinatura" htmlFor="subscription_status">
                    <Select name="subscription_status" defaultValue="trialing">
                      <SelectTrigger id="subscription_status" className={inputClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                        {Object.entries(STATUS_LABELS).map(([v, l]) => (
                          <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" key={v} value={v}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Pago até" htmlFor="paid_until">
                    <Input
                      id="paid_until"
                      name="paid_until"
                      type="date"
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Descrição" htmlFor="description">
                  <Textarea
                    id="description"
                    name="description"
                    className="min-h-20 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0"
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <SectionTitle>Dados do proprietário</SectionTitle>
                <Field label="Nome do proprietário" htmlFor="owner_name">
                  <Input id="owner_name" name="owner_name" required className={inputClass} />
                </Field>
                <Field label="E-mail (login)" htmlFor="owner_email">
                  <Input id="owner_email" name="owner_email" type="email" required className={inputClass} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone" htmlFor="owner_phone">
                    <Input id="owner_phone" name="owner_phone" required className={inputClass} />
                  </Field>
                  <Field label="Senha inicial" htmlFor="owner_password">
                    <Input
                      id="owner_password"
                      name="owner_password"
                      type="password"
                      required
                      className={inputClass}
                    />
                  </Field>
                </div>

                <label
                  htmlFor="owner_is_barber"
                  className="flex cursor-pointer items-start gap-3 rounded-[8px] border border-[#DDE3EE] bg-[#F6F7FB] p-3"
                >
                  <input
                    type="checkbox"
                    id="owner_is_barber"
                    checked={ownerIsBarber}
                    onChange={(e) => setOwnerIsBarber(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-[#DDE3EE] text-[#3157D5] focus:ring-[#3157D5]"
                  />
                  <span className="text-xs text-[#172033]">
                    O proprietário também atende como profissional
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0] disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                  </>
                ) : (
                  "Cadastrar estabelecimento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog
        open={!!editingBarbershop}
        onOpenChange={(open) => !open && setEditingBarbershop(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-[8px] border-[#DDE3EE] bg-white text-[#172033]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#172033]">
              Editar estabelecimento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-5 pt-2">
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20 border border-[#DDE3EE]">
                <AvatarImage src={editLogoPreview || ""} className="object-cover" />
                <AvatarFallback className="bg-[#F1F4F9]">
                  <Store className="h-7 w-7 text-[#94A3B8]" />
                </AvatarFallback>
              </Avatar>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.onchange = (e) => handleFileChange(e as any, true);
                  input.click();
                }}
                className="h-9 rounded-[8px] border-[#DDE3EE] bg-white text-xs text-[#172033] hover:bg-[#F6F7FB]"
              >
                Trocar logo
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Nome" htmlFor="edit_name">
                <Input id="edit_name" name="name" defaultValue={editingBarbershop?.name} className={inputClass} />
              </Field>
              <Field label="Categoria" htmlFor="edit_category">
                <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                  <SelectTrigger id="edit_category" className={inputClass}>
                    <SelectValue placeholder={categoriesLoading ? "Carregando categorias..." : "Selecione uma categoria"} />
                  </SelectTrigger>
                  <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                    {categoriesLoading && (
                      <div className="px-3 py-2 text-xs text-[#64748B]">Carregando categorias...</div>
                    )}
                    {!categoriesLoading && categoriesError && (
                      <div className="px-3 py-2 text-xs text-[#B91C1C]">{categoriesError}</div>
                    )}
                    {categories.map((c) => (
                      <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" key={c.id} value={c.id}>
                        {displayCategoryName(c.slug, c.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Valor mensal" htmlFor="edit_monthly">
                <Input
                  id="edit_monthly"
                  name="monthly_price"
                  type="text"
                  placeholder="R$ 0,00"
                  value={editMonthlyPrice}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setEditMonthlyPrice(fmtBRL(v ? parseInt(v) / 100 : 0));
                  }}
                  className={inputClass}
                />
              </Field>
              <Field label="Status da assinatura" htmlFor="edit_status">
                <Select
                  name="subscription_status"
                  defaultValue={editingBarbershop?.subscription_status || "trialing"}
                >
                  <SelectTrigger id="edit_status" className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border border-[#DDE3EE] bg-white text-[#172033] shadow-lg rounded-[8px]">
                    {Object.entries(STATUS_LABELS).map(([v, l]) => (
                      <SelectItem className="text-[#172033] focus:bg-[#EAF0FF] focus:text-[#3157D5] data-[state=checked]:bg-[#EAF0FF] data-[state=checked]:text-[#3157D5]" key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Pago até" htmlFor="edit_paid_until">
                <Input
                  id="edit_paid_until"
                  name="paid_until"
                  type="date"
                  defaultValue={editingBarbershop?.paid_until || ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Telefone" htmlFor="edit_phone">
                <Input
                  id="edit_phone"
                  name="phone"
                  defaultValue={editingBarbershop?.phone || ""}
                  className={inputClass}
                />
              </Field>
              <div className="md:col-span-2">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#172033]">Endereço</p>
                  {editingBarbershop?.address && (
                    <p className="text-[11px] text-[#64748B]">Atual: {editingBarbershop.address}</p>
                  )}
                  <AddressFields value={editAddress} onChange={setEditAddress} idPrefix="edit_addr" />
                </div>
              </div>
              <div className="md:col-span-2">
                <Field label="Descrição" htmlFor="edit_description">
                  <Textarea
                    id="edit_description"
                    name="description"
                    defaultValue={editingBarbershop?.description || ""}
                    className="min-h-24 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0"
                  />
                </Field>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-[8px] bg-[#3157D5] text-sm font-semibold text-white hover:bg-[#274ac0]"
              >
                {isSubmitting ? "Salvando..." : "Salvar alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog
        open={!!paymentModalShop}
        onOpenChange={(open) => !open && setPaymentModalShop(null)}
      >
        <DialogContent className="max-w-md rounded-[8px] border-[#DDE3EE] bg-white text-[#172033]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-[#172033]">
              Marcar pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-[8px] bg-[#F6F7FB] p-3 text-xs text-[#475569]">
              <p className="font-semibold text-[#172033]">{paymentModalShop?.name}</p>
              <p>
                Valor atual: <span className="font-medium">{money(paymentModalShop?.monthly_price)}</span>
              </p>
              <p>
                Novo vencimento:{" "}
                <span className="font-medium">
                  {paidUntil ? format(new Date(paidUntil), "dd/MM/yyyy") : "—"}
                </span>
              </p>
            </div>
            <Field label="Valor pago" htmlFor="pay_value">
              <Input
                id="pay_value"
                type="text"
                value={paymentValue}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setPaymentValue(fmtBRL(v ? parseInt(v) / 100 : 0));
                }}
                placeholder="R$ 0,00"
                className={inputClass}
              />
            </Field>
            <Field label="Pago até" htmlFor="pay_until">
              <Input
                id="pay_until"
                type="date"
                value={paidUntil}
                onChange={(e) => setPaidUntil(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button
              onClick={handleMarkPaid}
              disabled={isSubmitting || !paidUntil}
              className="h-11 w-full rounded-[8px] bg-[#16A34A] text-sm font-semibold text-white hover:bg-[#15803D] disabled:opacity-70"
            >
              {isSubmitting ? "Processando..." : "Confirmar pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingShop} onOpenChange={(open) => !open && setDeletingShop(null)}>
        <AlertDialogContent className="rounded-[8px] border-[#DDE3EE] bg-white text-[#172033]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-[#DC2626]">
              Excluir estabelecimento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#64748B]">
              Esta operação é permanente. Todos os dados de {" "}
              <strong className="text-[#172033]">{deletingShop?.name}</strong> serão removidos e não
              poderão ser recuperados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] hover:bg-[#F6F7FB]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="h-10 rounded-[8px] bg-[#DC2626] text-white hover:bg-[#B91C1C]"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirm */}
      <AlertDialog open={!!blockingShop} onOpenChange={(open) => !open && setBlockingShop(null)}>
        <AlertDialogContent className="rounded-[8px] border-[#DDE3EE] bg-white text-[#172033]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-semibold text-[#172033]">
              {blockingShop?.blocked ? "Desbloquear estabelecimento?" : "Bloquear estabelecimento?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#64748B]">
              {blockingShop?.blocked
                ? `${blockingShop?.name} voltará a ter acesso normal ao sistema.`
                : `${blockingShop?.name} perderá o acesso ao sistema até ser desbloqueado.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] hover:bg-[#F6F7FB]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleBlock}
              className={cn(
                "h-10 rounded-[8px] text-white",
                blockingShop?.blocked
                  ? "bg-[#16A34A] hover:bg-[#15803D]"
                  : "bg-[#DC2626] hover:bg-[#B91C1C]",
              )}
            >
              {blockingShop?.blocked ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProfileModal isOpen={isProfileModalOpen} onOpenChange={setIsProfileModalOpen} />
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-l-2 border-[#3157D5] pl-2 text-sm font-semibold text-[#172033]">
      {children}
    </h3>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className={labelClass}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function IconAction({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-[8px] border border-[#DDE3EE] bg-white text-[#475569] transition-colors hover:border-[#3157D5] hover:text-[#3157D5]",
        danger && "hover:border-[#DC2626] hover:text-[#DC2626]",
      )}
    >
      {children}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#F6F7FB] gap-3">
      <img src={gohubLogo} alt="GoHub" className="h-12 w-auto animate-pulse" />
      <p className="text-sm font-medium text-[#64748B]">Carregando painel...</p>
    </div>
  );
}
