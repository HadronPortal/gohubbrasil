-- Create profiles/users table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  whatsapp TEXT,
  role TEXT DEFAULT 'client',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create barbershops table
CREATE TABLE public.barbershops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create barbers table
CREATE TABLE public.barbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
  appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.barbershops TO anon, authenticated;
GRANT ALL ON public.barbershops TO service_role;

GRANT SELECT ON public.services TO anon, authenticated;
GRANT ALL ON public.services TO service_role;

GRANT SELECT ON public.barbers TO anon, authenticated;
GRANT ALL ON public.barbers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Barbershops are viewable by everyone" ON public.barbershops FOR SELECT USING (true);
CREATE POLICY "Services are viewable by everyone" ON public.services FOR SELECT USING (true);
CREATE POLICY "Barbers are viewable by everyone" ON public.barbers FOR SELECT USING (true);

CREATE POLICY "Users can view their own appointments" ON public.appointments FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can create their own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Insert dummy data for barbershops
INSERT INTO public.barbershops (name, address, logo_url, description) 
VALUES 
('Vintage Barba', 'Rua das Flores, 123', 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=200&h=200&auto=format&fit=crop', 'A melhor barbearia clássica da região.'),
('Modern Cut', 'Av. Paulista, 1000', 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?q=80&w=200&h=200&auto=format&fit=crop', 'Estilo e modernidade para o seu visual.');

-- Insert dummy data for services (using subqueries to get barbershop IDs)
DO $$
DECLARE
    v_barber1 UUID;
    v_barber2 UUID;
BEGIN
    SELECT id INTO v_barber1 FROM public.barbershops WHERE name = 'Vintage Barba' LIMIT 1;
    SELECT id INTO v_barber2 FROM public.barbershops WHERE name = 'Modern Cut' LIMIT 1;

    INSERT INTO public.services (barbershop_id, name, price, duration_minutes) VALUES
    (v_barber1, 'Corte de Cabelo', 50.00, 45),
    (v_barber1, 'Barba', 35.00, 30),
    (v_barber1, 'Corte e Barba', 75.00, 60),
    (v_barber2, 'Corte Moderno', 60.00, 40),
    (v_barber2, 'Barba Terapia', 45.00, 45);

    INSERT INTO public.barbers (barbershop_id, name, bio) VALUES
    (v_barber1, 'João da Barba', 'Especialista em cortes clássicos.'),
    (v_barber1, 'Ricardo Navalha', 'Mestre na lâmina.'),
    (v_barber2, 'Alex Style', 'Focado em tendências modernas.'),
    (v_barber2, 'Felipe Fade', 'O rei do degradê.');
END $$;
