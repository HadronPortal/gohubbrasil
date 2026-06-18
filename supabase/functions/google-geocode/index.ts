import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GeocodeRequest =
  | { mode: "reverse"; latitude: number; longitude: number }
  | { mode: "search"; query: string };

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!apiKey) throw new Error("GOOGLE_MAPS_API_KEY nao configurada");

    const body = (await request.json()) as GeocodeRequest;
    const params = new URLSearchParams({ key: apiKey, language: "pt-BR", region: "br" });
    if (body.mode === "reverse") {
      if (!Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) throw new Error("Coordenadas invalidas");
      params.set("latlng", `${body.latitude},${body.longitude}`);
    } else {
      if (!body.query?.trim()) throw new Error("Endereco obrigatorio");
      params.set("address", body.query.trim());
    }

    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
    const data = await response.json();
    if (!response.ok || data.status !== "OK" || !data.results?.length) {
      throw new Error(data.error_message || `Endereco nao encontrado (${data.status || response.status})`);
    }

    const result = data.results[0];
    const component = (type: string, short = false) => {
      const item = result.address_components?.find((entry: { types: string[] }) => entry.types.includes(type));
      return item ? (short ? item.short_name : item.long_name) : "";
    };
    const latitude = result.geometry?.location?.lat;
    const longitude = result.geometry?.location?.lng;
    const location = {
      label: result.formatted_address,
      street: component("route"),
      number: component("street_number"),
      neighborhood: component("sublocality_level_1") || component("neighborhood"),
      city: component("administrative_area_level_2") || component("locality"),
      state: component("administrative_area_level_1", true),
      postcode: component("postal_code"),
      latitude,
      longitude,
    };
    location.label = location.street
      ? `${location.street}${location.number ? `, ${location.number}` : location.neighborhood ? `, ${location.neighborhood}` : ""}`
      : result.formatted_address;

    return new Response(JSON.stringify({ success: true, location }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro de geolocalizacao" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
