
CREATE OR REPLACE FUNCTION public.get_my_appointments_safe()
RETURNS TABLE (
  id uuid,
  status text,
  starts_at timestamptz,
  price numeric,
  price_charged numeric,
  service_name text,
  barber_name text,
  barbershop_id uuid,
  barbershop_name text,
  barbershop_address text,
  barbershop_lat double precision,
  barbershop_lng double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.status::text,
    a.starts_at,
    a.price,
    a.price_charged,
    COALESCE(s.name, 'Serviço')::text AS service_name,
    COALESCE(b.name, u.name, 'Profissional')::text AS barber_name,
    a.barbershop_id,
    COALESCE(bs.name, 'Estabelecimento')::text AS barbershop_name,
    bs.address::text AS barbershop_address,
    bs.latitude::double precision AS barbershop_lat,
    bs.longitude::double precision AS barbershop_lng
  FROM public.appointments a
  LEFT JOIN public.services s ON s.id = a.service_id
  LEFT JOIN public.barbers b ON b.id = a.barber_id
  LEFT JOIN public.users u ON u.id = b.user_id
  LEFT JOIN public.barbershops bs ON bs.id = a.barbershop_id
  WHERE a.client_id = auth.uid()
  ORDER BY a.starts_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_appointments_safe() TO authenticated;
