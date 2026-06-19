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
  // Sobrancelhas e cílios
  "design": sobrancelhasDesign,
  "design de sobrancelhas": sobrancelhasDesign,
  "henna": sobrancelhasHenna,
  "micropigmentacao": sobrancelhasMicropig,
  "lash lifting": ciliosLashLifting,
  "extensao de cilios": ciliosExtensao,
  // Massoterapia
  "relaxante": massagemRelaxante,
  "massagem relaxante": massagemRelaxante,
  "terapeutica": massagemTerapeutica,
  "massagem terapeutica": massagemTerapeutica,
  "desportiva": massagemDesportiva,
  "massagem desportiva": massagemDesportiva,
  "esportiva": massagemDesportiva,
  "pedras quentes": massagemPedras,
  "massagem com pedras quentes": massagemPedras,
  // Maquiagem
  "social": maquiagemSocial,
  "maquiagem social": maquiagemSocial,
  "noiva": maquiagemNoiva,
  "maquiagem noiva": maquiagemNoiva,
  "festa": maquiagemFesta,
  "maquiagem festa": maquiagemFesta,
  "editorial": maquiagemEditorial,
  "maquiagem editorial": maquiagemEditorial,
  "dia a dia": maquiagemDiaDia,
  "maquiagem dia a dia": maquiagemDiaDia,
  // Depilação
  "cera": depilacaoCera,
  "depilacao com cera": depilacaoCera,
  "laser": depilacaoLaser,
  "depilacao a laser": depilacaoLaser,
  "depilacao facial": depilacaoFacial,
  "depilacao corporal": depilacaoCorporal,
  "intima": depilacaoIntima,
  "depilacao intima": depilacaoIntima,
  // Podologia
  "atendimento clinico": podologiaClinica,
  "clinico": podologiaClinica,
  "unha encravada": podologiaUnhaEncravada,
  "calosidades": podologiaCalosidades,
  "calos": podologiaCalosidades,
  "reflexologia": podologiaReflexologia,
  "spa dos pes": podologiaSpa,
  "spa": podologiaSpa,
};

// Category-scoped overrides for names that exist in more than one category.
const SERVICE_VISUALS_BY_CATEGORY: Record<string, Record<string, string>> = {
  massoterapia: {
    drenagem: massagemDrenagem,
    "drenagem linfatica": massagemDrenagem,
  },
  depilacao: {
    facial: depilacaoFacial,
    corporal: depilacaoCorporal,
  },
};

// 2) Keyword rules — ORDER MATTERS: most specific FIRST.
type Rule = { image: string; all: string[][] };
const RULES: Rule[] = [
  // --- Composite / specific cross-category matches MUST come first ---
  { image: barbeariaCorteBarba, all: [["corte"], ["barba"]] },          // corte + barba
  { image: barbeariaInfantil, all: [["corte"], ["infantil", "kids", "crianca"]] }, // corte infantil
  { image: ciliosExtensao, all: [["extensao"], ["cilio"]] },            // extensão de cílios
  { image: ciliosLashLifting, all: [["lash"], ["lift"]] },              // lash lifting
  { image: sobrancelhasMicropig, all: [["micropigmenta"]] },            // micropigmentação
  { image: podologiaUnhaEncravada, all: [["unha"], ["encrava"]] },      // unha encravada (antes de unha)
  { image: podologiaClinica, all: [["atendimento"], ["clinic"]] },      // atendimento clínico
  { image: podologiaSpa, all: [["spa"], ["pe"]] },                       // spa dos pés
  { image: depilacaoIntima, all: [["depila"], ["intim"]] },             // depilação íntima
  { image: depilacaoFacial, all: [["depila"], ["facial"]] },            // depilação facial (antes de facial)
  { image: depilacaoCorporal, all: [["depila"], ["corporal"]] },        // depilação corporal (antes de corporal)
  { image: depilacaoLaser, all: [["depila"], ["laser"]] },
  { image: depilacaoCera, all: [["depila"], ["cera"]] },
  { image: maquiagemSocial, all: [["maquiagem"], ["social"]] },
  { image: maquiagemNoiva, all: [["maquiagem"], ["noiva"]] },
  { image: maquiagemFesta, all: [["maquiagem"], ["festa"]] },
  { image: maquiagemEditorial, all: [["maquiagem"], ["editorial"]] },
  { image: maquiagemDiaDia, all: [["maquiagem"], ["dia"]] },
  // --- Barbearia (specific before generic) ---
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
  // --- Sobrancelhas e cílios ---
  { image: sobrancelhasDesign, all: [["design"]] },
  { image: sobrancelhasHenna, all: [["henna"]] },
  { image: ciliosExtensao, all: [["cilio"]] },
  { image: sobrancelhasDesign, all: [["sobranc"]] },
  // --- Massoterapia (after composite rules) ---
  { image: massagemPedras, all: [["pedras"]] },
  { image: massagemDesportiva, all: [["desportiv", "esportiv"]] },
  { image: massagemTerapeutica, all: [["terapeut"]] },
  { image: massagemRelaxante, all: [["relaxante"]] },
  // --- Maquiagem (generic fallbacks por palavra-chave única) ---
  { image: maquiagemNoiva, all: [["noiva"]] },
  { image: maquiagemEditorial, all: [["editorial"]] },
  { image: maquiagemFesta, all: [["festa"]] },
  // --- Depilação (generic fallback) ---
  { image: depilacaoLaser, all: [["laser"]] },
  { image: depilacaoCera, all: [["cera"]] },
  // --- Podologia (generic fallbacks) ---
  { image: podologiaReflexologia, all: [["reflexolog"]] },
  { image: podologiaCalosidades, all: [["calo"]] },
  { image: podologiaUnhaEncravada, all: [["encrava"]] },
  { image: podologiaClinica, all: [["podolog", "clinic"]] },
];

export function getServiceVisual(name: string, categoryId?: string): ServiceVisual {
  const n = normalizeName(name);
  // 0a) Direct icon_key lookup via the picker library (preferred path).
  // We use a dynamic dictionary set by serviceIcons.ts to avoid circular imports.
  const direct = (globalThis as any).__GOHUB_ICONS__?.[name];
  if (direct) return { image: direct, matched: true };
  if (n) {
    // 0) category-scoped exact match (disambiguates names shared across categories)
    if (categoryId) {
      const scoped = SERVICE_VISUALS_BY_CATEGORY[categoryId]?.[n];
      if (scoped) return { image: scoped, matched: true };
    }
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