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
  { id: "pet", label: "Pet", image: iconPet },
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

/**
 * Canonical pt-BR display name per category slug.
 * Used to normalize category names that may arrive mojibake-encoded
 * (e.g. "DepilaÃ§Ã£o") from the database. Display-only, never altered upstream.
 */
export const CATEGORY_SLUG_LABELS: Record<string, string> = {
  barbearias: "Barbearias",
  cabelos: "Cabelos",
  unhas: "Unhas",
  estetica: "Estética",
  massoterapia: "Massoterapia",
  sobrancelhas: "Sobrancelhas",
  maquiagem: "Maquiagem",
  depilacao: "Depilação",
  podologia: "Podologia",
  pet: "Pet",
};

/**
 * Sub-tipos que um estabelecimento Pet pode marcar simultaneamente
 * (ex.: um Pet shop que também faz Banho e tosa).
 */
export const PET_BUSINESS_TYPES = [
  "Pet shop",
  "Loja de rações",
  "Rações e acessórios",
  "Banho e tosa",
  "Clínica veterinária",
] as const;
export type PetBusinessType = (typeof PET_BUSINESS_TYPES)[number];

export function displayCategoryName(
  slug?: string | null,
  fallback: string = "",
): string {
  if (slug && CATEGORY_SLUG_LABELS[slug]) return CATEGORY_SLUG_LABELS[slug];
  return fallback || slug || "";
}
