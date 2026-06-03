import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get user from token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !caller) throw new Error('Invalid token')

    // 2. Check permissions (must be owner or superadmin)
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role, barbershop_id')
      .eq('id', caller.id)
      .single()

    if (profileError || (callerProfile?.role !== 'owner' && callerProfile?.role !== 'superadmin')) {
      throw new Error('Permissão negada. Apenas donos podem cadastrar barbeiros.')
    }

    const body = await req.json()
    const { 
      p_email, 
      p_password, 
      p_name, 
      p_phone, 
      p_bio, 
      p_commission_pct, 
      p_avatar_url,
      p_barbershop_id 
    } = body

    // Use caller's barbershop_id if not superadmin
    const targetBarbershopId = callerProfile.role === 'superadmin' ? p_barbershop_id : callerProfile.barbershop_id

    if (!targetBarbershopId) {
      throw new Error('ID da barbearia não fornecido.')
    }

    // 3. Check if user already exists in auth.users by email
    const { data: existingUserId } = await supabaseAdmin.rpc("get_auth_user_id_by_email", { 
      p_email 
    })

    let userId = existingUserId

    if (!userId) {
      // 4. Create Auth User
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: p_email,
        password: p_password,
        email_confirm: true,
        user_metadata: { 
          name: p_name,
          phone: p_phone,
          role: 'barber',
          barbershop_id: targetBarbershopId
        }
      })

      if (createError) throw new Error(`Erro ao criar usuário auth: ${createError.message}`)
      userId = newUser.user.id
    } else {
      // 5. Update Existing Auth User
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: p_password,
        user_metadata: {
          name: p_name,
          phone: p_phone,
          role: 'barber',
          barbershop_id: targetBarbershopId
        }
      })
      if (updateError) console.error("Error updating auth user:", updateError)
    }

    // 6. Upsert public.users
    const { error: userProfileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        name: p_name,
        phone: p_phone,
        role: 'barber',
        barbershop_id: targetBarbershopId,
        avatar_url: p_avatar_url || null
      })

    if (userProfileError) throw new Error(`Erro ao atualizar perfil public.users: ${userProfileError.message}`)

    // 7. Upsert public.barbers
    const { data: barberRecord, error: barberEntryError } = await supabaseAdmin
      .from('barbers')
      .upsert({
        user_id: userId,
        barbershop_id: targetBarbershopId,
        bio: p_bio || null,
        commission_pct: p_commission_pct || 0,
        active: true
      }, { onConflict: 'user_id' })
      .select()
      .single()

    if (barberEntryError) throw new Error(`Erro ao atualizar registro de barbeiro: ${barberEntryError.message}`)

    return new Response(JSON.stringify({ 
      success: true, 
      barber_id: barberRecord.id,
      user_id: userId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Create Barber Edge Function Error:", error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Returning 200 with success: false is standard for this project
    })
  }
})