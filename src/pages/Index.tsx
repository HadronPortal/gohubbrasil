import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  FileText, 
  CreditCard, 
  Settings,
  Search,
  Plus,
  Bell,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Index = () => {
  return (
    <div className="flex min-h-screen w-full bg-[#f4f7f6]">
      {/* Sidebar - Bling Style */}
      <aside className="w-64 bg-[#2c3e50] text-white flex flex-col">
        <div className="p-6 border-b border-[#34495e]">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">Bling!</h1>
        </div>
        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-3">
            {[
              { icon: LayoutDashboard, label: "Dashboard", active: true },
              { icon: ShoppingCart, label: "Vendas" },
              { icon: Package, label: "Suprimentos" },
              { icon: CreditCard, label: "Finanças" },
              { icon: Users, label: "Cadastros" },
              { icon: FileText, label: "Serviços" },
              { icon: Settings, label: "Preferências" },
            ].map((item, i) => (
              <li key={i}>
                <a
                  href="#"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                    item.active ? "bg-[#3498db] text-white" : "text-gray-300 hover:bg-[#34495e] hover:text-white"
                  }`}
                >
                  <item.icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input 
                className="pl-10 bg-gray-50 border-gray-200" 
                placeholder="Pesquisar por pedido, cliente ou produto..." 
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3 ml-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors">
              <div className="text-right">
                <p className="text-xs font-semibold text-gray-900">Empresa Demo</p>
                <p className="text-[10px] text-gray-500">Administrador</p>
              </div>
              <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                <User size={20} />
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
            <Button className="bg-[#27ae60] hover:bg-[#2ecc71] gap-2">
              <Plus size={18} />
              Novo Pedido
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Vendas Hoje", value: "R$ 4.250,00", change: "+12%", color: "border-l-blue-500" },
              { title: "Contas a Receber", value: "R$ 12.840,00", change: "8 pendentes", color: "border-l-orange-500" },
              { title: "Contas a Pagar", value: "R$ 3.120,00", change: "2 para hoje", color: "border-l-red-500" },
              { title: "Estoque Baixo", value: "15 itens", change: "Ação necessária", color: "border-l-purple-500" },
            ].map((stat, i) => (
              <Card key={i} className={`border-l-4 ${stat.color} shadow-sm`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                  <p className="text-xs text-green-600 mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="text-sm font-semibold">Últimas Vendas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3">Pedido</th>
                        <th className="px-6 py-3">Cliente</th>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Valor</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[101, 102, 103, 104].map((id) => (
                        <tr key={id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-blue-600 cursor-pointer">#{id}</td>
                          <td className="px-6 py-4">Cliente Exemplo {id}</td>
                          <td className="px-6 py-4">22/05/2026</td>
                          <td className="px-6 py-4">R$ 540,00</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-[10px] font-bold uppercase">
                              Atendido
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-gray-50/50">
                <CardTitle className="text-sm font-semibold">Avisos e Lembretes</CardTitle>
              </CardHeader>
              <CardContent className="py-4">
                <div className="space-y-4">
                  {[
                    "Sincronização com o Mercado Livre concluída.",
                    "Atualização de estoque: 5 novos produtos.",
                    "Configuração de NFe pendente para nova empresa.",
                  ].map((note, i) => (
                    <div key={i} className="flex gap-3 items-start text-xs text-gray-600 border-b pb-3 last:border-0 last:pb-0">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-400 shrink-0"></div>
                      <p>{note}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
