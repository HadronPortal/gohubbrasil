import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Check, 
  Star, 
  Headphones, 
  Globe, 
  Wallet,
  Eye,
  EyeOff
} from "lucide-react";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSocialRegister = (provider: string) => {
    setIsLoading(true);
    toast.info(`Conectando ao ${provider}...`);
    setTimeout(() => {
      setIsLoading(false);
      toast.success(`Cadastro com ${provider} realizado!`);
      navigate("/dashboard");
    }, 1500);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Conta criada com sucesso!");
      navigate("/dashboard");
    }, 1500);
  };

  const benefits = [
    {
      icon: Star,
      title: "Tudo em um só lugar",
      description: "Faça a gestão completa do seu negócio, do controle de estoque à gestão financeira"
    },
    {
      icon: Headphones,
      title: "Suporte com 95% de satisfação desde o primeiro dia",
      description: "Seja por telefone, chat, email, ticket, whatsapp..."
    },
    {
      icon: Globe,
      title: "Sistema 100% online",
      description: "Acesse o Painel Fácil a qualquer hora, de qualquer lugar!"
    },
    {
      icon: Wallet,
      title: "Sem cobranças surpresa!",
      description: "Comece seu teste grátis sem cadastrar cartão de crédito, escolha seu plano e troque quando quiser"
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Sidebar Benefits - Visible on MD and UP */}
      <div className="hidden md:flex md:w-1/3 bg-[#F4F7F6] p-12 flex-col gap-12 border-r border-gray-100 overflow-y-auto">
        <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-[#3498DB] transition-colors">
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Voltar</span>
        </Link>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[#2C3E50]">Painel Fácil</h1>
          <h2 className="text-3xl font-bold text-gray-900 leading-tight">Comece agora o seu teste grátis</h2>
          <p className="text-gray-600 font-medium">Com o Painel Fácil você torna a gestão do seu negócio mais fácil, ágil e automatizada</p>
        </div>

        <div className="space-y-8">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex gap-4">
              <div className="bg-white p-2 rounded-lg shadow-sm h-fit">
                <benefit.icon className="text-[#3498DB]" size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-800 text-sm leading-tight">{benefit.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-2xl mx-auto py-12 px-6 lg:px-12">
          {/* Header for mobile only */}
          <div className="md:hidden mb-8 text-center space-y-4">
            <h1 className="text-3xl font-bold text-[#2C3E50]">Painel Fácil</h1>
            <h2 className="text-xl font-bold text-gray-900">Comece seu teste grátis</h2>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 text-center md:text-left">Crie sua conta no Painel Fácil</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  disabled={isLoading}
                  onClick={() => handleSocialRegister("Google")}
                  className="h-12 border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Google</span>
                </Button>
                <Button 
                  variant="outline" 
                  disabled={isLoading}
                  onClick={() => handleSocialRegister("Facebook")}
                  className="h-12 border-gray-200 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span className="font-semibold text-gray-700">Facebook</span>
                </Button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <span className="w-full border-t border-gray-200"></span>
              <span className="absolute bg-white px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">ou insira seus dados abaixo</span>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Razão Social*</label>
                  <Input placeholder="Nome da sua empresa" className="h-12 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">E-mail de conta*</label>
                  <Input type="email" placeholder="exemplo@email.com" className="h-12 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Nº de WhatsApp*</label>
                  <Input placeholder="(00) 00000-0000" className="h-12 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">CNPJ / CPF</label>
                  <Input placeholder="00.000.000/0000-00" className="h-12 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Qual seu segmento de trabalho?*</label>
                  <select className="flex h-12 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#3498DB] focus:ring-1 focus:ring-[#3498DB]">
                    <option value="">Selecione uma opção</option>
                    <option value="ecommerce">Comércio (e-commerce)</option>
                    <option value="fisico">Comércio (loja física)</option>
                    <option value="industria">Indústria</option>
                    <option value="servicos">Serviços</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Qual o tamanho da sua empresa?*</label>
                  <select className="flex h-12 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-[#3498DB] focus:ring-1 focus:ring-[#3498DB]">
                    <option value="">Selecione uma opção</option>
                    <option value="mei">MEI</option>
                    <option value="micro">Micro</option>
                    <option value="pequena">Pequena</option>
                    <option value="media">Média / Grande</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Digite uma senha*</label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="Senha" 
                      className="h-12 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Confirme sua senha*</label>
                  <div className="relative">
                    <Input 
                      type={showConfirmPassword ? "text" : "password"} 
                      placeholder="Senha" 
                      className="h-12 border-gray-200 focus:border-[#3498DB] focus:ring-[#3498DB]" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2 pt-2">
                <Checkbox id="terms" className="mt-1 border-gray-300 data-[state=checked]:bg-[#3498DB] data-[state=checked]:border-[#3498DB]" />
                <label htmlFor="terms" className="text-xs text-gray-500 leading-normal cursor-pointer">
                  Declaro ter lido e aceitado os <a href="#" className="text-[#3498DB] hover:underline font-medium">termos e políticas de serviço</a>
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 bg-[#3498DB] hover:bg-[#2980B9] text-white font-bold text-lg shadow-lg shadow-blue-200 transition-all rounded-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    CRIANDO CONTA...
                  </>
                ) : (
                  "CRIAR CONTA"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
