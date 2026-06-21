import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

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

const professionalNames = {
  barbearias: ["Rafael Martins", "Caio Oliveira", "Lucas Andrade", "Bruno Lima", "Diego Alves", "Matheus Rocha"],
  cabelos: ["Marina Costa", "Júlia Freitas", "Camila Nunes", "Renata Alves", "Bianca Martins", "Larissa Prado"],
  unhas: ["Amanda Ribeiro", "Natália Souza", "Carla Mendes", "Isabela Lima", "Fernanda Castro", "Letícia Moraes"],
  estetica: ["Dra. Paula Ribeiro", "Aline Martins", "Dra. Beatriz Souza", "Mônica Reis", "Dra. Laura Campos", "Vanessa Lima"],
  massoterapia: ["Eduardo Nunes", "Patrícia Gomes", "Marcelo Farias", "Denise Rocha", "Thiago Barros", "Sabrina Alves"],
  sobrancelhas: ["Gabriela Freitas", "Lívia Martins", "Priscila Nunes", "Evelyn Costa", "Raquel Lima", "Débora Souza"],
  maquiagem: ["Bruna Ferreira", "Nicole Martins", "Vitória Alves", "Manuela Costa", "Giovana Ribeiro", "Milena Prado"],
  depilacao: ["Cristina Lopes", "Elisa Martins", "Mirela Santos", "Tatiane Alves", "Daniela Nunes", "Flávia Costa"],
  podologia: ["Dra. Adriana Lima", "Cláudia Martins", "Dra. Silvana Rocha", "Márcia Nunes", "Dra. Elaine Costa", "Rosana Alves"],
};

const photos = {
  barbearias: [
    "photo-1503951914875-452162b0f3f1",
    "photo-1621605815971-fbc98d665033",
    "photo-1585747860715-2ba37e788b70",
  ],
  cabelos: [
    "photo-1560066984-138dadb4c035",
    "photo-1522337360788-8b13dee7a37e",
    "photo-1633681926022-84c23e8cb2d6",
  ],
  unhas: [
    "photo-1604654894610-df63bc536371",
    "photo-1610992015732-2449b76344bc",
    "photo-1632345031435-8727f6897d53",
  ],
  estetica: [
    "photo-1570172619644-dfd03ed5d881",
    "photo-1616394584738-fc6e612e71b9",
    "photo-1515377905703-c4788e51af15",
  ],
  massoterapia: [
    "photo-1544161515-4ab6ce6db874",
    "photo-1600334089648-b0d9d3028eb2",
    "photo-1519823551278-64ac92734fb1",
  ],
  sobrancelhas: [
    "photo-1487412912498-0447578fcca8",
    "photo-1512496015851-a90fb38ba796",
    "photo-1526045478516-99145907023c",
  ],
  maquiagem: [
    "photo-1522335789203-aabd1fc54bc9",
    "photo-1596462502278-27bfdc403348",
    "photo-1515688594390-b649af70d282",
  ],
  depilacao: [
    "photo-1540555700478-4be289fbecef",
    "photo-1560750588-73207b1ef5b8",
    "photo-1556228578-8c89e6adf883",
  ],
  podologia: [
    "photo-1519415510236-718bdfcd89c8",
    "photo-1629909613654-28e377c37b09",
    "photo-1512678080530-7760d81faba6",
  ],
};

const photoUrl = (categorySlug, index) => {
  const photoId = photos[categorySlug]?.[index];
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=900&h=600&q=82`;
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
let insertedProfessionals = 0;

const { data: authPage, error: authListError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (authListError) throw authListError;
const authUsersByEmail = new Map(
  (authPage.users || []).map((user) => [String(user.email || "").toLowerCase(), user]),
);

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
      logo_url: photoUrl(category.slug, businessIndex),
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
    } else {
      const { error } = await supabase
        .from("barbershops")
        .update(payload)
        .eq("id", barbershopId);
      if (error) throw error;
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
      .slice(0, 5)
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

    const names = professionalNames[category.slug] || [];
    const selectedProfessionals = names.slice(businessIndex * 2, businessIndex * 2 + 2);

    for (const [professionalIndex, professionalName] of selectedProfessionals.entries()) {
      const demoIndex = businessIndex * 2 + professionalIndex + 1;
      const email = `demo.${slug}.${demoIndex}@gohub.app`.toLowerCase();
      const phone = `1698${String(categoryIndex + 1).padStart(2, "0")}${String(demoIndex).padStart(2, "0")}00`;
      let authUser = authUsersByEmail.get(email);

      if (!authUser) {
        const { data: createdAuth, error: createAuthError } = await supabase.auth.admin.createUser({
          email,
          password: `Demo-${randomUUID()}-A1!`,
          email_confirm: true,
          user_metadata: {
            name: professionalName,
            phone,
            role: "barber",
            barbershop_id: barbershopId,
            demo: true,
          },
        });
        if (createAuthError) throw createAuthError;
        authUser = createdAuth.user;
        authUsersByEmail.set(email, authUser);
      }

      const avatarNumber = ((categoryIndex * 6 + demoIndex - 1) % 70) + 1;
      const { error: profileError } = await supabase.from("users").upsert(
        {
          id: authUser.id,
          barbershop_id: barbershopId,
          role: "barber",
          name: professionalName,
          phone,
          avatar_url: `https://i.pravatar.cc/300?img=${avatarNumber}`,
        },
        { onConflict: "id" },
      );
      if (profileError) throw profileError;

      const { data: existingBarber, error: barberFindError } = await supabase
        .from("barbers")
        .select("id")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (barberFindError) throw barberFindError;

      const barberPayload = {
        user_id: authUser.id,
        barbershop_id: barbershopId,
        bio: `Profissional de ${category.name.toLowerCase()} com atendimento personalizado.`,
        commission_pct: 45 + professionalIndex * 5,
        active: true,
      };

      if (existingBarber?.id) {
        const { error } = await supabase
          .from("barbers")
          .update(barberPayload)
          .eq("id", existingBarber.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("barbers").insert(barberPayload);
        if (error) throw error;
        insertedProfessionals += 1;
      }
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
      insertedProfessionals,
      totalBusinesses: count,
      preservedRealBusinesses: 2,
    },
    null,
    2,
  ),
);
