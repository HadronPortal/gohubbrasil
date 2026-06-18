import iconBarbearias from "@/assets/categories/barbearias.png";
import iconCabelos from "@/assets/categories/cabelos.png";
import iconUnhas from "@/assets/categories/unhas.png";
import iconEstetica from "@/assets/categories/estetica.png";
import iconMassagem from "@/assets/categories/massagem.png";
import iconSobrancelhas from "@/assets/categories/sobrancelhas.png";
import iconMaquiagem from "@/assets/categories/maquiagem.png";
import iconDepilacao from "@/assets/categories/depilacao.png";
import iconPodologia from "@/assets/categories/podologia.png";
import iconVerMais from "@/assets/categories/ver-mais.png";

export type ClientCategory = {
  id: string;
  label: string;
  image: string;
  subcategories: string[];
  keywords: string[];
};

export const CLIENT_CATEGORIES: ClientCategory[] = [
  {
    id: "barbearias",
    label: "Barbearias",
    image: iconBarbearias,
    subcategories: ["Corte", "Barba", "Corte e barba", "Infantil", "Pigmentação"],
    keywords: ["barbearia", "barber", "barba", "corte masculino"],
  },
  {
    id: "cabelos",
    label: "Cabelos",
    image: iconCabelos,
    subcategories: ["Corte feminino", "Escova", "Coloração", "Hidratação", "Penteados"],
    keywords: ["cabelo", "cabeleireiro", "salão", "escova", "coloração"],
  },
  {
    id: "unhas",
    label: "Unhas",
    image: iconUnhas,
    subcategories: ["Manicure", "Pedicure", "Alongamento", "Esmaltação em gel", "Nail art"],
    keywords: ["unha", "manicure", "pedicure", "nail"],
  },
  {
    id: "estetica",
    label: "Estética",
    image: iconEstetica,
    subcategories: ["Limpeza de pele", "Facial", "Corporal", "Drenagem", "Harmonização"],
    keywords: ["estética", "facial", "pele", "harmonização"],
  },
  {
    id: "massoterapia",
    label: "Massagem",
    image: iconMassagem,
    subcategories: ["Relaxante", "Terapêutica", "Desportiva", "Drenagem", "Pedras quentes"],
    keywords: ["massagem", "massoterapia", "spa"],
  },
  {
    id: "sobrancelhas",
    label: "Sobrancelhas",
    image: iconSobrancelhas,
    subcategories: ["Design", "Henna", "Micropigmentação", "Lash lifting", "Extensão de cílios"],
    keywords: ["sobrancelha", "design", "henna"],
  },
  {
    id: "maquiagem",
    label: "Maquiagem",
    image: iconMaquiagem,
    subcategories: ["Social", "Noiva", "Festa", "Editorial", "Dia a dia"],
    keywords: ["maquiagem", "make"],
  },
  {
    id: "depilacao",
    label: "Depilação",
    image: iconDepilacao,
    subcategories: ["Cera", "Laser", "Facial", "Corporal", "Íntima"],
    keywords: ["depilação", "depilacao", "cera", "laser"],
  },
  {
    id: "podologia",
    label: "Podologia",
    image: iconPodologia,
    subcategories: ["Atendimento clínico", "Unha encravada", "Calosidades", "Reflexologia", "Spa dos pés"],
    keywords: ["podologia", "pés", "pe"],
  },
  {
    id: "todos",
    label: "Todas",
    image: iconVerMais,
    subcategories: [],
    keywords: [],
  },
];

export function getCategoryBySlug(slug: string): ClientCategory | undefined {
  return CLIENT_CATEGORIES.find((c) => c.id === slug);
}