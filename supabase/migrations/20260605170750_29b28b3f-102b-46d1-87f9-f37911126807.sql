-- Adicionar colunas de controle financeiro na tabela barbershops
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS monthly_price DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS paid_until DATE;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trialing';
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS blocked BOOLEAN DEFAULT false;

-- RPC para marcar como pago
CREATE OR REPLACE FUNCTION public.mark_barbershop_paid(
    p_barbershop_id UUID,
    p_paid_until DATE,
    p_amount DECIMAL(10,2),
    p_provider TEXT DEFAULT 'manual',
    p_reference TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Atualiza a barbearia
    UPDATE public.barbershops
    SET 
        paid_until = p_paid_until,
        subscription_status = 'active',
        blocked = false
    WHERE id = p_barbershop_id;

    -- Opcional: registrar em uma tabela de transações se existir no futuro
    -- INSERT INTO payment_history...

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Pagamento registrado com sucesso'
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para atualizar status de pagamento baseado nas datas
CREATE OR REPLACE FUNCTION public.refresh_barbershop_payment_status(p_barbershop_id UUID) 
RETURNS JSONB AS $$
DECLARE
    v_shop RECORD;
    v_new_status TEXT;
    v_blocked BOOLEAN;
BEGIN
    SELECT * INTO v_shop FROM public.barbershops WHERE id = p_barbershop_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Barbearia não encontrada');
    END IF;

    v_new_status := v_shop.subscription_status;
    v_blocked := v_shop.blocked;

    -- Lógica de status
    IF v_shop.subscription_status = 'trialing' AND v_shop.trial_ends_at < NOW() THEN
        v_new_status := 'past_due';
    ELSIF v_shop.subscription_status = 'active' AND v_shop.paid_until < CURRENT_DATE THEN
        v_new_status := 'past_due';
    END IF;

    -- Bloqueio automático após 3 dias de atraso (exemplo)
    IF v_new_status = 'past_due' AND (
        (v_shop.subscription_status = 'trialing' AND v_shop.trial_ends_at < (NOW() - INTERVAL '3 days')) OR
        (v_shop.subscription_status = 'active' AND v_shop.paid_until < (CURRENT_DATE - INTERVAL '3 days'))
    ) THEN
        v_blocked := true;
        v_new_status := 'blocked';
    END IF;

    UPDATE public.barbershops 
    SET subscription_status = v_new_status, blocked = v_blocked
    WHERE id = p_barbershop_id;

    RETURN jsonb_build_object('success', true, 'status', v_new_status, 'blocked', v_blocked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para verificar bloqueio
CREATE OR REPLACE FUNCTION public.barbershop_is_payment_blocked(p_barbershop_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
    v_blocked BOOLEAN;
BEGIN
    SELECT blocked INTO v_blocked FROM public.barbershops WHERE id = p_barbershop_id;
    RETURN COALESCE(v_blocked, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para listar barbearias disponíveis para clientes
CREATE OR REPLACE FUNCTION public.get_available_barbershops() 
RETURNS SETOF public.barbershops AS $$
BEGIN
    RETURN QUERY 
    SELECT * FROM public.barbershops 
    WHERE blocked = false 
    ORDER BY name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para superadmin listar barbearias com dados extras
CREATE OR REPLACE FUNCTION public.get_superadmin_barbershops() 
RETURNS TABLE (
    id UUID,
    name TEXT,
    address TEXT,
    phone TEXT,
    logo_url TEXT,
    description TEXT,
    monthly_price DECIMAL,
    paid_until DATE,
    subscription_status TEXT,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    blocked BOOLEAN,
    owner_name TEXT,
    owner_phone TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id, b.name, b.address, b.phone, b.logo_url, b.description,
        b.monthly_price, b.paid_until, b.subscription_status, b.trial_ends_at, b.blocked,
        u.name as owner_name, u.phone as owner_phone
    FROM public.barbershops b
    LEFT JOIN public.users u ON u.barbershop_id = b.id AND u.role = 'owner'
    ORDER BY b.name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants
GRANT EXECUTE ON FUNCTION public.mark_barbershop_paid TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_barbershop_paid TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_barbershop_payment_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.barbershop_is_payment_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_barbershops TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_superadmin_barbershops TO authenticated;
