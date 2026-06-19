import { normalizeName } from "@/lib/serviceVisuals";

import barbeariaCorte from "@/assets/services/barbearia-corte-maquina.png";
import barbeariaBarba from "@/assets/services/barbearia-barba-navalha.png";
import barbeariaCorteBarba from "@/assets/services/barbearia-corte-e-barba.png";
import barbeariaInfantil from "@/assets/services/barbearia-infantil.png";
import barbeariaPigmentacao from "@/assets/services/barbearia-pigmentacao.png";
import cabelosCorteFem from "@/assets/services/cabelos-corte-feminino.png";
import cabelosEscova from "@/assets/services/cabelos-escova.png";
import cabelosColoracao from "@/assets/services/cabelos-coloracao.png";
import cabelosHidratacao from "@/assets/services/cabelos-hidratacao.png";
import cabelosPenteados from "@/assets/services/cabelos-penteados.png";
import unhasManicure from "@/assets/services/unhas-manicure.png";
import unhasPedicure from "@/assets/services/unhas-pedicure.png";
import unhasAlongamento from "@/assets/services/unhas-alongamento.png";
import unhasGel from "@/assets/services/unhas-gel.png";
import unhasNailArt from "@/assets/services/unhas-nail-art.png";
import esteticaLimpeza from "@/assets/services/estetica-limpeza-pele.png";
import esteticaFacial from "@/assets/services/estetica-facial.png";
import esteticaCorporal from "@/assets/services/estetica-corporal.png";
import esteticaDrenagem from "@/assets/services/estetica-drenagem.png";
import esteticaHarmonizacao from "@/assets/services/estetica-harmonizacao.png";
import massagemRelaxante from "@/assets/services/massagem-relaxante.png";
import massagemTerapeutica from "@/assets/services/massagem-terapeutica.png";
import massagemDesportiva from "@/assets/services/massagem-desportiva.png";
import massagemDrenagem from "@/assets/services/massagem-drenagem.png";
import massagemPedras from "@/assets/services/massagem-pedras-quentes.png";
import sobrancelhasDesign from "@/assets/services/sobrancelhas-design.png";
import sobrancelhasHenna from "@/assets/services/sobrancelhas-henna.png";
import sobrancelhasMicropig from "@/assets/services/sobrancelhas-micropigmentacao.png";
import ciliosLashLifting from "@/assets/services/cilios-lash-lifting.png";
import ciliosExtensao from "@/assets/services/cilios-extensao.png";
import maquiagemSocial from "@/assets/services/maquiagem-social.png";
import maquiagemNoiva from "@/assets/services/maquiagem-noiva.png";
import maquiagemFesta from "@/assets/services/maquiagem-festa.png";
import maquiagemEditorial from "@/assets/services/maquiagem-editorial.png";
import maquiagemDiaDia from "@/assets/services/maquiagem-dia-dia.png";
import depilacaoCera from "@/assets/services/depilacao-cera.png";
import depilacaoLaser from "@/assets/services/depilacao-laser.png";
import depilacaoFacial from "@/assets/services/depilacao-facial.png";
import depilacaoCorporal from "@/assets/services/depilacao-corporal.png";
import depilacaoIntima from "@/assets/services/depilacao-intima.png";
import podologiaClinica from "@/assets/services/podologia-clinica.png";
import podologiaUnhaEncravada from "@/assets/services/podologia-unha-encravada.png";
import podologiaCalosidades from "@/assets/services/podologia-calosidades.png";
import podologiaReflexologia from "@/assets/services/podologia-reflexologia.png";
import podologiaSpa from "@/assets/services/podologia-spa.png";

export type IconEntry = {
  key: string;
  label: string;
  image: string;
  category: string; // category slug
  aliases?: string[]; // extra normalized name aliases
};

export const ICON_LIBRARY: IconEntry[] = [
  // Barbearias
  { key: "corte", label: "Corte masculino", image: barbeariaCorte, category: "barbearias", aliases: ["corte masculino", "pezinho"] },
  { key: "barba", label: "Barba", image: barbeariaBarba, category: "barbearias" },
  { key: "corte-e-barba", label: "Corte e barba", image: barbeariaCorteBarba, category: "barbearias" },
  { key: "corte-infantil", label: "Corte infantil", image: barbeariaInfantil, category: "barbearias", aliases: ["infantil", "kids"] },
  { key: "pigmentacao", label: "Pigmentação", image: barbeariaPigmentacao, category: "barbearias" },
  // Cabelos
  { key: "corte-feminino", label: "Corte feminino", image: cabelosCorteFem, category: "cabelos" },
  { key: "escova", label: "Escova", image: cabelosEscova, category: "cabelos" },
  { key: "coloracao", label: "Coloração", image: cabelosColoracao, category: "cabelos", aliases: ["luzes", "mechas", "tintura"] },
  { key: "hidratacao", label: "Hidratação", image: cabelosHidratacao, category: "cabelos" },
  { key: "penteados", label: "Penteados", image: cabelosPenteados, category: "cabelos", aliases: ["progressiva", "prancha"] },
  // Unhas
  { key: "manicure", label: "Manicure", image: unhasManicure, category: "unhas" },
  { key: "pedicure", label: "Pedicure", image: unhasPedicure, category: "unhas" },
  { key: "alongamento", label: "Alongamento", image: unhasAlongamento, category: "unhas" },
  { key: "esmaltacao-gel", label: "Esmaltação em gel", image: unhasGel, category: "unhas", aliases: ["gel", "unhas em gel"] },
  { key: "nail-art", label: "Nail art", image: unhasNailArt, category: "unhas" },
  // Estética
  { key: "limpeza-de-pele", label: "Limpeza de pele", image: esteticaLimpeza, category: "estetica" },
  { key: "facial", label: "Facial", image: esteticaFacial, category: "estetica" },
  { key: "corporal", label: "Corporal", image: esteticaCorporal, category: "estetica" },
  { key: "drenagem-linfatica", label: "Drenagem linfática", image: esteticaDrenagem, category: "estetica", aliases: ["drenagem"] },
  { key: "harmonizacao", label: "Harmonização", image: esteticaHarmonizacao, category: "estetica" },
  // Massoterapia
  { key: "massagem-relaxante", label: "Massagem relaxante", image: massagemRelaxante, category: "massoterapia", aliases: ["relaxante"] },
  { key: "massagem-terapeutica", label: "Massagem terapêutica", image: massagemTerapeutica, category: "massoterapia", aliases: ["terapeutica"] },
  { key: "massagem-desportiva", label: "Massagem desportiva", image: massagemDesportiva, category: "massoterapia", aliases: ["desportiva", "esportiva"] },
  { key: "drenagem-linfatica-massagem", label: "Drenagem linfática", image: massagemDrenagem, category: "massoterapia", aliases: ["drenagem", "drenagem linfatica"] },
  { key: "pedras-quentes", label: "Pedras quentes", image: massagemPedras, category: "massoterapia", aliases: ["pedras"] },
  // Sobrancelhas e cílios
  { key: "design-sobrancelhas", label: "Design de sobrancelhas", image: sobrancelhasDesign, category: "sobrancelhas", aliases: ["design", "sobrancelhas"] },
  { key: "henna", label: "Henna", image: sobrancelhasHenna, category: "sobrancelhas" },
  { key: "micropigmentacao", label: "Micropigmentação", image: sobrancelhasMicropig, category: "sobrancelhas" },
  { key: "lash-lifting", label: "Lash lifting", image: ciliosLashLifting, category: "sobrancelhas" },
  { key: "extensao-cilios", label: "Extensão de cílios", image: ciliosExtensao, category: "sobrancelhas" },
  // Maquiagem
  { key: "maquiagem-social", label: "Maquiagem social", image: maquiagemSocial, category: "maquiagem", aliases: ["social"] },
  { key: "maquiagem-noiva", label: "Maquiagem de noiva", image: maquiagemNoiva, category: "maquiagem", aliases: ["noiva"] },
  { key: "maquiagem-festa", label: "Maquiagem para festa", image: maquiagemFesta, category: "maquiagem", aliases: ["festa"] },
  { key: "maquiagem-editorial", label: "Maquiagem editorial", image: maquiagemEditorial, category: "maquiagem", aliases: ["editorial"] },
  { key: "maquiagem-dia-dia", label: "Maquiagem dia a dia", image: maquiagemDiaDia, category: "maquiagem", aliases: ["dia a dia"] },
  // Depilação
  { key: "depilacao-cera", label: "Depilação com cera", image: depilacaoCera, category: "depilacao", aliases: ["cera"] },
  { key: "depilacao-laser", label: "Depilação a laser", image: depilacaoLaser, category: "depilacao", aliases: ["laser"] },
  { key: "depilacao-facial", label: "Depilação facial", image: depilacaoFacial, category: "depilacao" },
  { key: "depilacao-corporal", label: "Depilação corporal", image: depilacaoCorporal, category: "depilacao" },
  { key: "depilacao-intima", label: "Depilação íntima", image: depilacaoIntima, category: "depilacao", aliases: ["intima"] },
  // Podologia
  { key: "atendimento-clinico", label: "Atendimento clínico", image: podologiaClinica, category: "podologia", aliases: ["clinico", "podologia"] },
  { key: "unha-encravada", label: "Unha encravada", image: podologiaUnhaEncravada, category: "podologia" },
  { key: "calosidades", label: "Calosidades", image: podologiaCalosidades, category: "podologia", aliases: ["calos"] },
  { key: "reflexologia", label: "Reflexologia", image: podologiaReflexologia, category: "podologia" },
  { key: "spa-dos-pes", label: "Spa dos pés", image: podologiaSpa, category: "podologia", aliases: ["spa"] },
];

const ICON_BY_KEY: Record<string, IconEntry> = ICON_LIBRARY.reduce((acc, entry) => {
  acc[entry.key] = entry;
  return acc;
}, {} as Record<string, IconEntry>);

// Expose a flat key→image map for getServiceVisual() to consume without
// introducing a circular import between serviceVisuals.ts and this file.
if (typeof globalThis !== "undefined") {
  const map: Record<string, string> = {};
  ICON_LIBRARY.forEach((entry) => {
    map[entry.key] = entry.image;
  });
  (globalThis as any).__GOHUB_ICONS__ = map;
}

export function getIconByKey(key?: string | null): IconEntry | null {
  if (!key) return null;
  return ICON_BY_KEY[key] || null;
}

export function getIconsForCategory(categorySlug?: string | null): IconEntry[] {
  if (!categorySlug || categorySlug === "todos") return ICON_LIBRARY;
  return ICON_LIBRARY.filter((entry) => entry.category === categorySlug);
}

/**
 * Suggest the best matching icon key for a given service name within a category.
 * Strategy: exact name → alias → keyword include → same-category fallback (null otherwise).
 */
export function suggestIconKey(name: string, categorySlug?: string | null): string | null {
  const n = normalizeName(name);
  if (!n) return null;

  const inCategory = getIconsForCategory(categorySlug);
  const pool = inCategory.length > 0 ? inCategory : ICON_LIBRARY;

  // 1) exact label/key/alias match
  for (const entry of pool) {
    const candidates = [entry.label, entry.key.replace(/-/g, " "), ...(entry.aliases || [])];
    if (candidates.some((c) => normalizeName(c) === n)) return entry.key;
  }
  // 2) substring (entry name contained in input OR input contained in entry name)
  for (const entry of pool) {
    const candidates = [entry.label, entry.key.replace(/-/g, " "), ...(entry.aliases || [])];
    if (candidates.some((c) => {
      const cn = normalizeName(c);
      return cn.length >= 4 && (n.includes(cn) || cn.includes(n));
    })) return entry.key;
  }
  return null;
}
