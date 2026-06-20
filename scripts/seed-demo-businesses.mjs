import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const categoryNames = {
  depilacao: "Depilação",
  estetica: "Estética",
};

const businesses = {
  barbearias: [
    ["Barbearia Dom Pedro", "Cortes clássicos e modernos para todas as idades."],
    ["Barber House 27", "Barba, cabelo e cuidados masculinos em um só lugar."],
    ["Studio Navalha", "Atendimento personalizado com hora marcada."],
  ],
  cabelos: [
    ["Studio Bella Hair", "Cortes, escovas, coloração e tratamentos capilares."],
    ["Maison dos Cabelos", "Beleza e saúde para todos os tipos de cabelo."],
    ["Espaço Fios", "Transformações, penteados e hidratação profissional."],
  ],
  unhas: [
    ["Nail Boutique", "Manicure, pedicure e alongamentos com acabamento impecável."],
    ["Esmalteria Jardim", "Cuidado completo para mãos e pés."],
    ["Ateliê das Unhas", "Nail art, esmaltação em gel e alongamento."],
  ],
  estetica: [
    ["Clínica Lumina", "Estética facial e corporal com atendimento personalizado."],
    ["Essenza Estética", "Tecnologia e cuidado para realçar sua beleza."],
    ["Pele & Forma", "Limpeza de pele, drenagem e tratamentos corporais."],
  ],
  massoterapia: [
    ["Serena Massoterapia", "Massagens para relaxar o corpo e renovar as energias."],
    ["Espaço Equilíbrio", "Terapias manuais para bem-estar e qualidade de vida."],
    ["Viva Leve Terapias", "Massagem relaxante, terapêutica e pedras quentes."],
  ],
  sobrancelhas: [
    ["Brow Design Studio", "Design, henna e cuidados especializados para o olhar."],
    ["Olhar Marcante", "Sobrancelhas e cílios com resultado natural."],
    ["Ateliê do Olhar", "Micropigmentação, lash lifting e design personalizado."],
  ],
  maquiagem: [
    ["Makeup Garden", "Maquiagem profissional para festas e eventos."],
    ["Studio Glow", "Produções sociais, editoriais e para noivas."],
    ["Belle Make", "Beleza, técnica e personalidade em cada produção."],
  ],
  depilacao: [
    ["Pele Lisa Studio", "Depilação com conforto, segurança e privacidade."],
    ["Laser Prime", "Tecnologia para resultados duradouros."],
    ["Espaço Suave", "Depilação facial e corporal com atendimento cuidadoso."],
  ],
  podologia: [
    ["Pés em Dia", "Saúde e conforto para seus pés."],
    ["Clínica Passo Leve", "Podologia clínica e cuidados preventivos."],
    ["Espaço Pé Saudável", "Tratamentos especializados e spa dos pés."],
  ],
};

const photos = {
  barbearias: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80",
  cabelos: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80",
  unhas: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
  estetica: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
  massoterapia: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
  sobrancelhas: "https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80",
  maquiagem: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  depilacao: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
  podologia: "https://images.unsplash.com/photo-1519415510236-718bdfcd89c8?auto=format&fit=crop&w=900&q=80",
};

const addresses = [
  ["Avenida São Carlos, 1450 - Centro - São Carlos/SP - CEP 13560-011", -22.0154, -47.8911],
  ["Rua Episcopal, 920 - Centro - São Carlos/SP - CEP 13560-570", -22.0187, -47.8928],
  ["Rua XV de Novembro, 1880 - Centro - São Carlos/SP - CEP 13560-240", -22.0131, -47.8875],
  ["Avenida Dr. Carlos Botelho, 1120 - Vila Pureza - São Carlos/SP - CEP 13561-003", -22.0072, -47.8919],
  ["Rua Dona Alexandrina, 1660 - Centro - São Carlos/SP - CEP 13560-290", -22.0209, -47.8894],
  ["Avenida Trabalhador São-Carlense, 650 - Parque Arnold Schimidt - São Carlos/SP - CEP 13566-590", -22.0065, -47.8968],
  ["Rua Miguel Petroni, 2450 - Jardim Bandeirantes - São Carlos/SP - CEP 13562-190", -21.9984, -47.9016],
  ["Avenida Sallum, 780 - Vila Prado - São Carlos/SP - CEP 13574-040", -22.0291, -47.8982],
  ["Rua Larga, 540 - Vila Prado - São Carlos/SP - CEP 13574-030", -22.0324, -47.8951],
];

const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const { data: categories, error: categoryError } = await supabase
  .from("business_categories")
  .select("id,slug,name");
if (categoryError) throw categoryError;

for (const category of categories) {
  const correctedName = categoryNames[category.slug];
  if (correctedName && category.name !== correctedName) {
    const { error } = await supabase
      .from("business_categories")
      .update({ name: correctedName })
      .eq("id", category.id);
    if (error) throw error;
  }
}

const { data: catalog, error: catalogError } = await supabase
  .from("service_catalog")
  .select("id,name,icon_key,category_id")
  .eq("active", true);
if (catalogError) throw catalogError;

let insertedBusinesses = 0;
let insertedServices = 0;

for (const [categoryIndex, category] of categories.entries()) {
  const entries = businesses[category.slug] || [];
  const categoryServices = catalog.filter((item) => item.category_id === category.id);

  for (const [businessIndex, [name, description]] of entries.entries()) {
    const slug = `demo-${category.slug}-${slugify(name)}`;
    const address = addresses[(categoryIndex + businessIndex) % addresses.length];
    const payload = {
      name,
      slug,
      phone: `1699${String(categoryIndex + 1).padStart(2, "0")}${String(businessIndex + 1).padStart(2, "0")}000`,
      address: address[0],
      logo_url: photos[category.slug],
      active: true,
      description,
      blocked: false,
      subscription_status: "active",
      subscription_plan: "monthly",
      monthly_price: 0,
      category_id: category.id,
      latitude: address[1] + businessIndex * 0.0012,
      longitude: address[2] - businessIndex * 0.0011,
    };

    let { data: existing, error: findError } = await supabase
      .from("barbershops")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (findError) throw findError;

    let barbershopId = existing?.id;
    if (!barbershopId) {
      const { data: created, error } = await supabase
        .from("barbershops")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      barbershopId = created.id;
      insertedBusinesses += 1;
    }

    const { error: linkError } = await supabase
      .from("barbershop_categories")
      .upsert(
        { barbershop_id: barbershopId, category_id: category.id },
        { onConflict: "barbershop_id,category_id", ignoreDuplicates: true },
      );
    if (linkError) throw linkError;

    const { data: existingServices, error: existingServiceError } = await supabase
      .from("services")
      .select("catalog_service_id")
      .eq("barbershop_id", barbershopId);
    if (existingServiceError) throw existingServiceError;
    const existingCatalogIds = new Set(
      (existingServices || []).map((item) => item.catalog_service_id).filter(Boolean),
    );

    const selectedServices = categoryServices.slice(
      businessIndex % Math.max(categoryServices.length, 1),
    );
    const servicesToCreate = [...selectedServices, ...categoryServices]
      .filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index)
      .slice(0, 3)
      .filter((item) => !existingCatalogIds.has(item.id))
      .map((item, serviceIndex) => ({
        barbershop_id: barbershopId,
        name: item.name,
        duration_min: 30 + serviceIndex * 15,
        duration_minutes: 30 + serviceIndex * 15,
        price: 35 + categoryIndex * 4 + serviceIndex * 15,
        active: true,
        catalog_service_id: item.id,
        icon_key: item.icon_key,
      }));

    if (servicesToCreate.length) {
      const { error } = await supabase.from("services").insert(servicesToCreate);
      if (error) throw error;
      insertedServices += servicesToCreate.length;
    }
  }
}

const { count, error: countError } = await supabase
  .from("barbershops")
  .select("id", { count: "exact", head: true });
if (countError) throw countError;

console.log(
  JSON.stringify(
    {
      insertedBusinesses,
      insertedServices,
      totalBusinesses: count,
      preservedRealBusinesses: 2,
    },
    null,
    2,
  ),
);
