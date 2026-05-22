import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Lock, Building2 } from "lucide-react";

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7F6] p-4">
      <div className="w-full max-w-[450px] space-y-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-2">
          <Link to="/login" className="self-start flex items-center gap-2 text-gray-500 hover:text-[#3498DB] transition-colors mb-2">
            <ArrowLeft size={16} />
            <span className="text-sm font-medium">Voltar para o login</span>
          </Link>
          <h1 className="text-4xl font-bold text-[#2C3E50] tracking-tight">
            Painel <span className="text-[#3498DB]">Fácil</span>
          </h1>
          <p className="text-gray-500 text-sm text-center">Comece agora seu teste grátis de 30 dias. Sem cartão de crédito.</p>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-xl overflow-hidden">
          <CardHeader className="pt-8 pb-4 text-center">
            <h2 className="text-xl font-semibold text-gray-800">Criar minha conta</h2>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    placeholder="Como deseja ser chamado?" 
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">E-mail corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    type="email"
                    placeholder="seuemail@empresa.com.br" 
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Celular / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input 
                      placeholder="(00) 00000-0000" 
                      className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Segmento</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select className="flex h-12 w-full rounded-md border border-gray-200 bg-gray-50 pl-10 pr-3 py-2 text-sm ring-offset-background focus:outline-none focus:border-[#3498DB] focus:ring-1 focus:ring-[#3498DB] disabled:cursor-not-allowed disabled:opacity-50 appearance-none text-gray-500">
                      <option value="">Selecione...</option>
                      <option value="ecommerce">E-commerce</option>
                      <option value="servicos">Serviços</option>
                      <option value="varejo">Varejo</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Crie uma senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    type="password"
                    placeholder="Mínimo 8 caracteres" 
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2 py-2">
                <Checkbox id="terms" className="mt-1 border-gray-300 data-[state=checked]:bg-[#3498DB]" />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-normal cursor-pointer">
                  Ao me cadastrar, concordo com os <a href="#" className="text-[#3498DB] hover:underline">Termos de Uso</a> e <a href="#" className="text-[#3498DB] hover:underline">Políticas de Privacidade</a>.
                </label>
              </div>

              <Button className="w-full h-12 bg-[#27AE60] hover:bg-[#2ECC71] text-white font-bold text-base transition-all">
                CRIAR MINHA CONTA GRÁTIS
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-gray-600 text-sm">
            Já tem uma conta? <Link to="/login" className="text-[#3498DB] font-bold hover:underline">Acesse aqui</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
