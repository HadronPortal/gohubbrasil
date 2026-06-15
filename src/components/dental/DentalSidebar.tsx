import {
  Brain,
  Users,
  Calendar,
  ShoppingCart,
  DollarSign,
  CreditCard,
  Wrench,
  Megaphone,
  Package,
  Store,
  Settings,
  HelpCircle,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import dentalLogo from "@/assets/dental-logo.png.asset.json";

const items = [
  { label: "Inteligência", icon: Brain, to: "/dental/inteligencia" },
  { label: "Pacientes", icon: Users, to: "/dental/pacientes" },
  { label: "Agenda", icon: Calendar, to: "/dental" },
  { label: "Vendas", icon: ShoppingCart, to: "/dental/vendas" },
  { label: "Financeiro", icon: DollarSign, to: "/dental/financeiro" },
  { label: "Simples Pay", icon: CreditCard, to: "/dental/pay" },
  { label: "Controle de prótese", icon: Wrench, to: "/dental/protese" },
  { label: "Marketing", icon: Megaphone, to: "/dental/marketing" },
  { label: "Estoque", icon: Package, to: "/dental/estoque" },
  { label: "Loja", icon: Store, to: "/dental/loja" },
  { label: "Ajustes", icon: Settings, to: "/dental/ajustes" },
  { label: "Como funciona", icon: HelpCircle, to: "/dental/ajuda" },
  { label: "Chamar vendedor", icon: Phone, to: "/dental/vendedor" },
];

export function DentalSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={`${collapsed ? "w-16" : "w-60"} relative transition-all duration-200 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0`}
    >
      <div className={`h-14 flex items-center border-b border-slate-200 ${collapsed ? "justify-center px-0" : "px-5"}`}>
        {!collapsed && <img src={dentalLogo.url} alt="GoHub Dental" className="h-10 w-auto object-contain" />}
      </div>
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expandir menu" : "Retrair menu"}
        className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-blue-600"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/dental"}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 ${collapsed ? "justify-center px-0" : "px-5"} py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}