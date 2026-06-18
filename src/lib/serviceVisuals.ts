import barbeariaCorte from "@/assets/services/barbearia-corte.png";
import barbeariaBarba from "@/assets/services/barbearia-barba.png";
import barbeariaCorteBarba from "@/assets/services/barbearia-corte-barba.png";
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

import catBarbearias from "@/assets/categories/barbearias.png";
import catCabelos from "@/assets/categories/cabelos.png";
import catUnhas from "@/assets/categories/unhas.png";
import catEstetica from "@/assets/categories/estetica.png";
import catMassagem from "@/assets/categories/massagem.png";
import catSobrancelhas from "@/assets/categories/sobrancelhas.png";
import catMaquiagem from "@/assets/categories/maquiagem.png";
import catDepilacao from "@/assets/categories/depilacao.png";
import catPodologia from "@/assets/categories/podologia.png";
import catVerMais from "@/assets/categories/ver-mais.png";

export type ServiceVisual = { image: string; matched: boolean };

const CATEGORY_FALLBACK: Record<string, string> = {
  barbearias: catBarbearias,
  cabelos: catCabelos,
  unhas: catUnhas,
  estetica: catEstetica,
  massoterapia: catMassagem,
  sobrancelhas: catSobrancelhas,
  maquiagem: catMaquiagem,
  depilacao: catDepilacao,
  podologia: catPodologia,
  todos: catVerMais,
};

export function normalizeName(input: string): string {
  return (input || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[+&/]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 1) Explicit, exact (post-normalization) name map. Highest precedence.
const SERVICE_VISUALS: Record<string, string> = {
  // Barbearia
  "corte": barbeariaCorte,
  "corte masculino": barbeariaCorte,
  "pezinho": barbeariaCorte,
  "barba": barbeariaBarba,
  "corte e barba": barbeariaCorteBarba,
  "corte + barba": barbeariaCorteBarba,
  "infantil": barbeariaInfantil,
  "corte infantil": barbeariaInfantil,
  "pigmentacao": barbeariaPigmentacao,
  // Cabelos
  "corte feminino": cabelosCorteFem,
  "escova": cabelosEscova,
  "coloracao": cabelosColoracao,
  "hidratacao": cabelosHidratacao,
  "penteados": cabelosPenteados,
  // Unhas
  "manicure": unhasManicure,
  "pedicure": unhasPedicure,
  "alongamento": unhasAlongamento,
  "esmaltacao em gel": unhasGel,
  "esmaltacao gel": unhasGel,
  "unhas em gel": unhasGel,
  "nail art": unhasNailArt,
  // Estetica
  "limpeza de pele": esteticaLimpeza,
  "facial": esteticaFacial,
  "corporal": esteticaCorporal,
  "drenagem": esteticaDrenagem,
  "drenagem linfatica": esteticaDrenagem,
  "harmonizacao": esteticaHarmonizacao,
  "harmonizacao facial": esteticaHarmonizacao,
};

// 2) Keyword rules — ORDER MATTERS: most specific FIRST.
type Rule = { image: string; all: string[][] };
const RULES: Rule[] = [
  // --- Barbearia (specific before generic) ---
  { image: barbeariaCorteBarba, all: [["corte"], ["barba"]] },          // corte + barba
  { image: barbeariaInfantil, all: [["corte"], ["infantil", "kids", "crianca"]] },
  { image: barbeariaInfantil, all: [["infantil", "kids", "crianca"]] },
  { image: barbeariaPigmentacao, all: [["pigmenta"]] },
  { image: barbeariaBarba, all: [["barba"]] },
  // --- Cabelos (specific before generic) ---
  { image: cabelosCorteFem, all: [["corte"], ["feminino"]] },           // BEFORE generic "corte"
  { image: cabelosColoracao, all: [["luzes", "mechas"]] },
  { image: cabelosColoracao, all: [["colora", "tintura"]] },
  { image: cabelosHidratacao, all: [["hidrata"]] },
  { image: cabelosPenteados, all: [["penteado", "progressiva", "prancha"]] },
  { image: cabelosEscova, all: [["escova"]] },
  // generic corte masculino (after corte+barba/infantil/feminino)
  { image: barbeariaCorte, all: [["pezinho"]] },
  { image: barbeariaCorte, all: [["corte"]] },
  { image: cabelosCorteFem, all: [["cabelo"]] },
  // --- Unhas (specific before generic) ---
  { image: unhasNailArt, all: [["nail"], ["art"]] },
  { image: unhasNailArt, all: [["decora"]] },
  { image: unhasGel, all: [["gel"]] },                                  // "esmaltação em gel"
  { image: unhasAlongamento, all: [["alongamento"]] },
  { image: unhasManicure, all: [["manicure"]] },
  { image: unhasPedicure, all: [["pedicure"]] },
  { image: unhasManicure, all: [["esmalta"]] },
  { image: unhasManicure, all: [["unha"]] },
  // --- Estetica (specific before generic) ---
  { image: esteticaLimpeza, all: [["limpeza"], ["pele"]] },             // BEFORE generic "limpeza"
  { image: esteticaLimpeza, all: [["limpeza"]] },
  { image: esteticaHarmonizacao, all: [["harmoniza"]] },
  { image: esteticaHarmonizacao, all: [["botox", "preenchimento"]] },
  { image: esteticaDrenagem, all: [["drenagem"]] },
  { image: esteticaCorporal, all: [["corporal"]] },
  { image: esteticaFacial, all: [["facial"]] },
];

export function getServiceVisual(name: string, categoryId?: string): ServiceVisual {
  const n = normalizeName(name);
  if (n) {
    // 1) exact map
    const exact = SERVICE_VISUALS[n];
    if (exact) return { image: exact, matched: true };
    // 2) keyword rules, ordered specific -> generic
    for (const rule of RULES) {
      const ok = rule.all.every((group) => group.some((token) => n.includes(token)));
      if (ok) return { image: rule.image, matched: true };
    }
  }
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn("[GoHub] Serviço usando fallback:", name);
  }
  const fallback = (categoryId && CATEGORY_FALLBACK[categoryId]) || catVerMais;
  return { image: fallback, matched: false };
}