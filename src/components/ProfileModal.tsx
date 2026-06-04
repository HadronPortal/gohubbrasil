import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitial } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, Mail, Phone, User, Lock, Check } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileModal({ isOpen, onOpenChange }: ProfileModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (isOpen && profile) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setEmail(user?.email || "");
      setPassword("");
      setConfirmPassword("");
    }
  }, [isOpen, profile, user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const cleanPhone = String(phone || '').replace(/\D/g, '');

      // 1. Update public.users (Name and Phone)
      const { error: profileError } = await supabase
        .from("users")
        .update({
          name: name.trim(),
          phone: cleanPhone || null,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Update Email if changed
      if (email && email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });
        
        if (emailError) {
          if (emailError.message.toLowerCase().includes("oauth") || emailError.message.toLowerCase().includes("google")) {
            toast.error("Esta conta usa login com Google. Altere o e-mail pela sua conta Google ou entre com e-mail e senha.");
          } else {
            toast.error(emailError.message);
          }
        } else {
          toast.info("Enviamos um e-mail de confirmação para concluir a alteração do e-mail.");
        }
      }

      // 3. Update Password if provided
      if (password) {
        if (password.length < 6) {
          toast.error("A senha deve ter pelo menos 6 caracteres.");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error("As senhas não coincidem.");
          setLoading(false);
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: password,
        });

        if (passwordError) {
          if (passwordError.message.toLowerCase().includes("oauth") || passwordError.message.toLowerCase().includes("google")) {
            toast.error("Esta conta usa login com Google. Altere o e-mail pela sua conta Google ou entre com e-mail e senha.");
          } else {
            toast.error(passwordError.message);
          }
          setLoading(false);
          return;
        }
        toast.success("Senha atualizada com sucesso.");
        setPassword("");
        setConfirmPassword("");
      }

      toast.success("Perfil atualizado");
      await refreshProfile();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141b2a] border-[#2a3347] text-[#c8d4e8] max-w-[350px] sm:max-w-[400px] p-6 rounded-[8px]">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase text-[#f0c040] tracking-widest text-xl">
            MEU PERFIL
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-2">
            <Avatar className="w-20 h-20 border-2 border-[#f0c040]/50 shadow-[0_0_15px_rgba(240,192,64,0.1)]">
              <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-[#1c2333] text-[#f0c040] text-xl font-bold">
                {getInitial(profile?.name, user?.email)}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] text-[#8a9ab5] uppercase tracking-widest font-bold">
              ID: {user?.id.substring(0, 8)}...
            </span>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[10px] uppercase text-[#8a9ab5] tracking-widest font-bold flex items-center gap-2">
                <User className="w-3 h-3 text-[#f0c040]" /> NOME COMPLETO
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] h-11 focus-visible:ring-[#f0c040] rounded-none"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[10px] uppercase text-[#8a9ab5] tracking-widest font-bold flex items-center gap-2">
                <Mail className="w-3 h-3 text-[#f0c040]" /> E-MAIL
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] h-11 focus-visible:ring-[#f0c040] rounded-none"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[10px] uppercase text-[#8a9ab5] tracking-widest font-bold flex items-center gap-2">
                <Phone className="w-3 h-3 text-[#f0c040]" /> WHATSAPP
              </Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="(00) 00000-0000"
                className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] h-11 focus-visible:ring-[#f0c040] rounded-none"
              />
            </div>

            <div className="pt-2 border-t border-[#2a3347]/50 mt-4">
              <span className="text-[10px] uppercase text-[#f0c040] tracking-widest font-bold">ALTERAR SENHA</span>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pass" className="text-[10px] uppercase text-[#8a9ab5] tracking-widest font-bold">NOVA SENHA</Label>
                <Input
                  id="pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="******"
                  className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] h-11 focus-visible:ring-[#f0c040] rounded-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-[10px] uppercase text-[#8a9ab5] tracking-widest font-bold">CONFIRMAR</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="******"
                  className="bg-[#1c2333] border-[#2a3347] text-[#c8d4e8] h-11 focus-visible:ring-[#f0c040] rounded-none"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto font-oswald uppercase tracking-widest text-xs text-[#8a9ab5] hover:text-[#c8d4e8] hover:bg-[#1c2333]"
          >
            CANCELAR
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto bg-[#f0c040] hover:bg-[#d4a935] text-[#1c2333] font-oswald uppercase tracking-widest text-xs font-bold h-11 rounded-none px-8"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
            SALVAR ALTERAÇÕES
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
