import iconBarbearias from "@/assets/categories/barbearias.png";
import iconCabelos from "@/assets/categories/cabelos.png";
import iconUnhas from "@/assets/categories/unhas.png";
import iconEstetica from "@/assets/categories/estetica.png";
import iconMassagem from "@/assets/categories/massagem.png";
import iconSobrancelhas from "@/assets/categories/sobrancelhas.png";
import iconMaquiagem from "@/assets/categories/maquiagem.png";
import iconDepilacao from "@/assets/categories/depilacao.png";
import iconPodologia from "@/assets/categories/podologia.png";

export type EstablishmentCategory = {
  id: string;
  label: string;
  image: string;
};

export const ESTABLISHMENT_CATEGORIES: EstablishmentCategory[] = [
  { id: "barbearias", label: "Barbearia", image: iconBarbearias },
  { id: "cabelos", label: "Cabelos", image: iconCabelos },
  { id: "unhas", label: "Unhas", image: iconUnhas },
  { id: "estetica", label: "Estética", image: iconEstetica },
  { id: "massoterapia", label: "Massoterapia", image: iconMassagem },
  { id: "sobrancelhas", label: "Sobrancelhas", image: iconSobrancelhas },
  { id: "maquiagem", label: "Maquiagem", image: iconMaquiagem },
  { id: "depilacao", label: "Depilação", image: iconDepilacao },
  { id: "podologia", label: "Podologia", image: iconPodologia },
];

const STORAGE_KEY = "gohub:shop-category";

export function getShopCategory(shopId: string): string {
  if (typeof window === "undefined") return "barbearias";
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:${shopId}`);
    return raw && ESTABLISHMENT_CATEGORIES.some((c) => c.id === raw) ? raw : "barbearias";
  } catch {
    return "barbearias";
  }
}

export function setShopCategory(shopId: string, categoryId: string) {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${shopId}`, categoryId);
  } catch {
    /* ignore */
  }
}

export function getCategoryMeta(id: string): EstablishmentCategory {
  return (
    ESTABLISHMENT_CATEGORIES.find((c) => c.id === id) || ESTABLISHMENT_CATEGORIES[0]
  );
}
