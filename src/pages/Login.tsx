import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Facebook, Mail } from "lucide-react";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7F6] p-4">
      <div className="w-full max-w-[400px] space-y-8">
        {/* Logo Section */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-4xl font-bold text-[#2C3E50] tracking-tight">
            Painel <span className="text-[#3498DB]">Fácil</span>
          </h1>
          <p className="text-gray-500 text-sm">O ERP que descomplica sua empresa</p>
        </div>

        <Card className="border-none shadow-xl bg-white rounded-xl overflow-hidden">
          <CardHeader className="pt-8 pb-4 text-center">
            <h2 className="text-xl font-semibold text-gray-800">Acessar minha conta</h2>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">E-mail ou usuário</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    placeholder="Seu e-mail ou nome de usuário" 
                    className="pl-10 h-12 bg-gray-50 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium text-gray-700">Senha</label>
                  <a href="#" className="text-sm text-[#3498DB] hover:underline">Esqueci a senha</a>
                </div>
                <div className="relative">
                  <Input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha" 
                    className="h-12 bg-gray-50 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2 py-1">
                <Checkbox id="remember" className="border-gray-300 data-[state=checked]:bg-[#3498DB]" />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">Lembrar de mim</label>
              </div>

              <Button className="w-full h-12 bg-[#27AE60] hover:bg-[#2ECC71] text-white font-bold text-base transition-all">
                ENTRAR
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-100"></span>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-400">Ou entre com</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-11 border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-600 gap-2">
                <Facebook className="text-blue-600" size={18} />
                Facebook
              </Button>
              <Button variant="outline" className="h-11 border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-600 gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white font-bold">G</div>
                Google
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center space-y-4">
          <p className="text-gray-600 text-sm">
            Não tem uma conta? <a href="#" className="text-[#3498DB] font-bold hover:underline">Teste grátis por 30 dias</a>
          </p>
          <div className="flex justify-center gap-4 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-600">Central de Ajuda</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-600">Políticas de Privacidade</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
