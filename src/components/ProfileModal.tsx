import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitial } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  Phone,
  User as UserIcon,
  Lock,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { LogoutSection } from "@/components/LogoutSection";

interface ProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatBRPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function ProfileModal({ isOpen, onOpenChange }: ProfileModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Hydrate values when opening — always start in read-only mode.
  useEffect(() => {
    if (isOpen) {
      setName(profile?.name || "");
      setPhone(formatBRPhone(profile?.phone || ""));
      setEmail(user?.email || "");
      setPassword("");
      setConfirmPassword("");
      setEditing(false);
      setShowPassword(false);
    }
  }, [isOpen, profile, user]);

  // Focus the first editable field only after the user explicitly enters edit mode.
  useEffect(() => {
    if (editing) {
      const t = window.setTimeout(() => firstFieldRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [editing]);

  const handleCancel = () => {
    setName(profile?.name || "");
    setPhone(formatBRPhone(profile?.phone || ""));
    setEmail(user?.email || "");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setEditing(false);
    // Close virtual keyboard
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  const handleSave = async () => {
    if (!user) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Informe seu nome.");
      return;
    }
    if (cleanPhone && cleanPhone.length < 10) {
      toast.error("Telefone inválido.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update profile (name + phone)
      const { error: profileError } = await supabase
        .from("users")
        .update({ name: trimmedName, phone: cleanPhone || null })
        .eq("id", user.id);
      if (profileError) throw profileError;

      // 2. Update email if changed (auth.users)
      if (email && email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) {
          if (/oauth|google/i.test(emailError.message)) {
            toast.error(
              "Esta conta usa login com Google. Altere o e-mail pela sua conta Google.",
            );
          } else {
            toast.error(emailError.message);
          }
        } else {
          toast.info(
            "Enviamos um e-mail de confirmação para concluir a alteração.",
          );
        }
      }

      await refreshProfile();
      toast.success("Perfil atualizado");
      setEditing(false);
      (document.activeElement as HTMLElement | null)?.blur?.();
    } catch (err: any) {
      console.error("Profile update error:", err);
      toast.error(err.message || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (/oauth|google/i.test(error.message)) {
          toast.error("Esta conta usa login com Google.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Senha atualizada com sucesso.");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    } finally {
      setLoading(false);
    }
  };

  const readOnly = !editing;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="gohub-client max-w-[400px] rounded-[8px] border-[#DDE3EE] bg-[#F6F7FB] p-0 text-[#172033]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b border-[#DDE3EE] bg-white px-5 py-4 rounded-t-[8px]">
          <DialogTitle className="text-base font-semibold text-[#172033]">
            Meu perfil
          </DialogTitle>
          {!editing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="h-9 gap-1.5 rounded-[8px] px-3 text-[#3157D5] hover:bg-[#3157D5]/10 hover:text-[#3157D5]"
            >
              <Pencil className="h-4 w-4" />
              <span className="text-sm font-medium">Editar perfil</span>
            </Button>
          )}
        </DialogHeader>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {/* Avatar */}
          <div className="mb-5 flex flex-col items-center gap-2">
            <Avatar className="h-20 w-20 border border-[#DDE3EE] bg-white">
              <AvatarImage
                src={profile?.avatar_url || undefined}
                className="object-cover"
              />
              <AvatarFallback className="bg-[#EEF2FB] text-lg font-semibold text-[#3157D5]">
                {getInitial(profile?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-[#64748B]">Sua foto de perfil</span>
          </div>

          {/* Fields card */}
          <div className="space-y-4 rounded-[8px] border border-[#DDE3EE] bg-white p-4">
            <Field
              id="profile-name"
              label="Nome completo"
              icon={<UserIcon className="h-3.5 w-3.5" />}
              value={name}
              onChange={(v) => setName(v)}
              readOnly={readOnly}
              inputRef={firstFieldRef}
              autoComplete="name"
            />
            <Field
              id="profile-email"
              label="E-mail"
              icon={<Mail className="h-3.5 w-3.5" />}
              type="email"
              value={email}
              onChange={(v) => setEmail(v)}
              readOnly={readOnly}
              autoComplete="email"
            />
            <Field
              id="profile-phone"
              label="WhatsApp"
              icon={<Phone className="h-3.5 w-3.5" />}
              type="tel"
              value={phone}
              onChange={(v) => setPhone(formatBRPhone(v))}
              readOnly={readOnly}
              inputMode="numeric"
              placeholder="(00) 00000-0000"
              autoComplete="tel"
            />
          </div>

          {/* Edit-mode action row */}
          {editing && (
            <div className="mt-4 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
                className="h-11 flex-1 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] hover:bg-[#F6F7FB]"
              >
                <X className="mr-1.5 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={loading}
                className="h-11 flex-1 rounded-[8px] bg-[#3157D5] font-semibold text-white hover:bg-[#274ac0] active:bg-[#1f3ea3]"
              >
                {loading ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1.5 h-4 w-4" />
                )}
                Salvar alterações
              </Button>
            </div>
          )}

          {/* Password — separate action */}
          <div className="mt-5 rounded-[8px] border border-[#DDE3EE] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#3157D5]" />
                <span className="text-sm font-semibold text-[#172033]">
                  Alterar senha
                </span>
              </div>
              {!showPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(true)}
                  className="h-8 rounded-[8px] px-2 text-sm font-medium text-[#3157D5] hover:bg-[#3157D5]/10 hover:text-[#3157D5]"
                >
                  Alterar
                </Button>
              )}
            </div>

            {showPassword && (
              <div className="mt-3 space-y-3">
                <Field
                  id="profile-pass"
                  label="Nova senha"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder="******"
                />
                <Field
                  id="profile-pass-confirm"
                  label="Confirmar senha"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="******"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPassword(false);
                      setPassword("");
                      setConfirmPassword("");
                    }}
                    disabled={loading}
                    className="h-11 flex-1 rounded-[8px] border-[#DDE3EE] bg-white text-[#172033] hover:bg-[#F6F7FB]"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={loading}
                    className="h-11 flex-1 rounded-[8px] bg-[#3157D5] font-semibold text-white hover:bg-[#274ac0]"
                  >
                    {loading ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : null}
                    Salvar senha
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="mt-5">
            <LogoutSection onBeforeLogout={() => onOpenChange(false)} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  icon?: React.ReactNode;
  type?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

function Field({
  id,
  label,
  value,
  onChange,
  readOnly = false,
  icon,
  type = "text",
  placeholder,
  inputMode,
  autoComplete,
  inputRef,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-medium text-[#475569]"
      >
        {icon ? <span className="text-[#3157D5]">{icon}</span> : null}
        {label}
      </Label>
      <Input
        id={id}
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        inputMode={inputMode}
        autoComplete={autoComplete}
        onFocus={(e) => {
          // Prevent text auto-selection
          const v = e.target.value;
          e.target.setSelectionRange(v.length, v.length);
        }}
        className={
          "h-11 rounded-[8px] border border-[#DDE3EE] bg-white px-3 text-[#172033] placeholder:text-[#94A3B8] focus-visible:border-[#3157D5] focus-visible:ring-2 focus-visible:ring-[#3157D5]/15 focus-visible:ring-offset-0 " +
          (readOnly
            ? "cursor-default bg-[#F6F7FB] text-[#475569] focus-visible:ring-0 focus-visible:border-[#DDE3EE]"
            : "")
        }
      />
    </div>
  );
}