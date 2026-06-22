import iconBarbearias from "@/assets/categories/barbearias.png";
import iconCabelos from "@/assets/categories/cabelos.png";
import iconUnhas from "@/assets/categories/unhas.png";
import iconEstetica from "@/assets/categories/estetica.png";
import iconMassagem from "@/assets/categories/massagem.png";
import iconSobrancelhas from "@/assets/categories/sobrancelhas.png";
import iconMaquiagem from "@/assets/categories/maquiagem.png";
import iconDepilacao from "@/assets/categories/depilacao.png";
import iconPodologia from "@/assets/categories/podologia.png";
import iconPet from "@/assets/categories/pet.png";
import iconVerMais from "@/assets/categories/ver-mais.png";

export type ClientCategory = {
  id: string;
  label: string;
  image: string;
  subcategories: string[];
  keywords: string[];
  eyebrow: string;
  headline: string;
  accent: string;
  soft: string;
};

export const CLIENT_CATEGORIES: ClientCategory[] = [
  {
    id: "barbearias",
    label: "Barbearias",
    image: iconBarbearias,
    subcategories: ["Corte", "Barba", "Corte e barba", "Infantil", "Pigmentação"],
    keywords: ["barbearia", "barber", "barba", "corte masculino"],
    eyebrow: "Estilo em dia",
    headline: "Seu próximo corte começa aqui",
    accent: "#3157D5",
    soft: "#EAF0FF",
  },
  {
    id: "cabelos",
    label: "Cabelos",
    image: iconCabelos,
    subcategories: ["Corte feminino", "Escova", "Coloração", "Hidratação", "Penteados"],
    keywords: ["cabelo", "cabeleireiro", "salão", "escova", "coloração"],
    eyebrow: "Cuidado completo",
    headline: "Cabelos incríveis, perto de você",
    accent: "#7C3AED",
    soft: "#F1EAFE",
  },
  {
    id: "unhas",
    label: "Unhas",
    image: iconUnhas,
    subcategories: ["Manicure", "Pedicure", "Alongamento", "Esmaltação em gel", "Nail art"],
    keywords: ["unha", "manicure", "pedicure", "nail"],
    eyebrow: "Detalhes que encantam",
    headline: "Encontre sua manicure favorita",
    accent: "#E54888",
    soft: "#FDEAF2",
  },
  {
    id: "estetica",
    label: "Estética",
    image: iconEstetica,
    subcategories: ["Limpeza de pele", "Facial", "Corporal", "Drenagem", "Harmonização"],
    keywords: ["estética", "facial", "pele", "harmonização"],
    eyebrow: "Seu momento",
    headline: "Beleza e autocuidado do seu jeito",
    accent: "#D54B72",
    soft: "#FCECF1",
  },
  {
    id: "massoterapia",
    label: "Massagem",
    image: iconMassagem,
    subcategories: ["Relaxante", "Terapêutica", "Desportiva", "Drenagem", "Pedras quentes"],
    keywords: ["massagem", "massoterapia", "spa"],
    eyebrow: "Respire fundo",
    headline: "Bem-estar para corpo e mente",
    accent: "#148A72",
    soft: "#E7F7F2",
  },
  {
    id: "sobrancelhas",
    label: "Sobrancelhas",
    image: iconSobrancelhas,
    subcategories: ["Design", "Henna", "Micropigmentação", "Lash lifting", "Extensão de cílios"],
    keywords: ["sobrancelha", "design", "henna"],
    eyebrow: "Olhar marcante",
    headline: "Especialistas em sobrancelhas e cílios",
    accent: "#B86A2F",
    soft: "#FAF0E7",
  },
  {
    id: "maquiagem",
    label: "Maquiagem",
    image: iconMaquiagem,
    subcategories: ["Social", "Noiva", "Festa", "Editorial", "Dia a dia"],
    keywords: ["maquiagem", "make"],
    eyebrow: "Para cada ocasião",
    headline: "Maquiadores que realçam você",
    accent: "#A63B8F",
    soft: "#F8EAF5",
  },
  {
    id: "depilacao",
    label: "Depilação",
    image: iconDepilacao,
    subcategories: ["Cera", "Laser", "Facial", "Corporal", "Íntima"],
    keywords: ["depilação", "depilacao", "cera", "laser"],
    eyebrow: "Pele bem cuidada",
    headline: "Depilação com conforto e confiança",
    accent: "#008E9B",
    soft: "#E5F6F7",
  },
  {
    id: "podologia",
    label: "Podologia",
    image: iconPodologia,
    subcategories: ["Atendimento clínico", "Unha encravada", "Calosidades", "Reflexologia", "Spa dos pés"],
    keywords: ["podologia", "pés", "pe"],
    eyebrow: "Leveza a cada passo",
    headline: "Cuidado especializado para seus pés",
    accent: "#E27B35",
    soft: "#FFF0E5",
  },
  {
    id: "pet",
    label: "Pet",
    image: iconPet,
    subcategories: [
      "Banho",
      "Tosa",
      "Banho e tosa",
      "Tosa higiênica",
      "Hidratação",
      "Corte de unhas",
      "Limpeza de ouvidos",
      "Escovação",
      "Táxi pet",
      "Creche pet",
    ],
    keywords: ["pet", "cachorro", "gato", "banho e tosa", "veterinário", "ração"],
    eyebrow: "Cuidando de quem você ama",
    headline: "Tudo para o seu pet em um só lugar",
    accent: "#F59E0B",
    soft: "#FFF4DC",
  },
  {
    id: "todos",
    label: "Todas",
    image: iconVerMais,
    subcategories: [],
    keywords: [],
    eyebrow: "Tudo em um só lugar",
    headline: "Descubra serviços para cuidar de você",
    accent: "#3157D5",
    soft: "#EAF0FF",
  },
];

export function getCategoryBySlug(slug: string): ClientCategory | undefined {
  return CLIENT_CATEGORIES.find((c) => c.id === slug);
}
