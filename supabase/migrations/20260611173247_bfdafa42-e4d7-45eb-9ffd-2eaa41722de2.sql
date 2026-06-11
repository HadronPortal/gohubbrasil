CREATE OR REPLACE FUNCTION public.auto_complete_past_appointments()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
 DECLARE
     v_count integer;
 BEGIN
     -- Update appointments that have already ended and are still in pending or confirmed status
     -- We use price_charged and commission_pct to update commission_amount
     UPDATE public.appointments a
     SET status = 'completed',
         price = COALESCE(a.price, a.price_charged),
         commission_amount = COALESCE(a.commission_amount, a.price_charged * (COALESCE(b.commission_pct, 0) / 100.0))
     FROM public.barbers b
     WHERE a.barber_id = b.id
       AND a.ends_at <= now()
       AND a.status IN ('pending', 'confirmed');
       
     GET DIAGNOSTICS v_count = ROW_COUNT;
     
     RETURN jsonb_build_object('success', true, 'updated_count', v_count);
 EXCEPTION WHEN OTHERS THEN
     RETURN jsonb_build_object('success', false, 'error', SQLERRM);
 END;
 $$;

GRANT EXECUTE ON FUNCTION public.auto_complete_past_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_complete_past_appointments() TO anon;
GRANT EXECUTE ON FUNCTION public.auto_complete_past_appointments() TO service_role;

CREATE OR REPLACE FUNCTION public.finish_appointment_by_owner(p_appointment_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 AS $$
 DECLARE
     v_user_id UUID;
     v_user_role TEXT;
     v_user_barbershop_id UUID;
     v_appointment_barbershop_id UUID;
     v_price_charged NUMERIC;
     v_commission_pct NUMERIC;
     v_commission_amount NUMERIC;
 BEGIN
     v_user_id := auth.uid();
     
     -- Get the role and barbershop_id of the current user
     SELECT role, barbershop_id INTO v_user_role, v_user_barbershop_id
     FROM public.users
     WHERE id = v_user_id;
     
     IF v_user_role NOT IN ('owner', 'superadmin') THEN
         RETURN jsonb_build_object('success', false, 'error', 'Permissão negada ou usuário não é dono');
     END IF;
     
     -- Check if appointment exists
     SELECT a.barbershop_id, a.price_charged, b.commission_pct
     INTO v_appointment_barbershop_id, v_price_charged, v_commission_pct
     FROM public.appointments a
     JOIN public.barbers b ON a.barber_id = b.id
     WHERE a.id = p_appointment_id;
     
     IF v_appointment_barbershop_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'error', 'Agendamento não encontrado');
     END IF;
     
     -- Check if it's the owner's barbershop or superadmin
     IF v_user_role != 'superadmin' AND v_appointment_barbershop_id != v_user_barbershop_id THEN
          RETURN jsonb_build_object('success', false, 'error', 'Agendamento não pertence a sua barbearia');
     END IF;
 
     -- Calculate commission
     v_commission_amount := v_price_charged * (COALESCE(v_commission_pct, 0) / 100.0);
 
     -- Update appointment
     UPDATE public.appointments
     SET status = 'completed',
         price = v_price_charged,
         commission_amount = v_commission_amount
     WHERE id = p_appointment_id;
 
     RETURN jsonb_build_object(
         'success', true, 
         'price', v_price_charged, 
         'commission_amount', v_commission_amount
     );
 EXCEPTION WHEN OTHERS THEN
     RETURN jsonb_build_object('success', false, 'error', SQLERRM);
 END;
 $$;

GRANT EXECUTE ON FUNCTION public.finish_appointment_by_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_appointment_by_owner(uuid) TO service_role;
