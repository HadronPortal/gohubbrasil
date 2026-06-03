CREATE OR REPLACE VIEW public.owner_appointments_view AS
SELECT 
    a.id,
    a.starts_at,
    a.status,
    a.price_charged,
    a.barbershop_id,
    u_client.name as client_name,
    u_barber.name as barber_name,
    s.name as service_name
FROM 
    public.appointments a
JOIN 
    public.users u_client ON a.client_id = u_client.id
JOIN 
    public.barbers b ON a.barber_id = b.id
JOIN 
    public.users u_barber ON b.user_id = u_barber.id
JOIN 
    public.services s ON a.service_id = s.id;

GRANT SELECT ON public.owner_appointments_view TO authenticated;
GRANT SELECT ON public.owner_appointments_view TO service_role;
