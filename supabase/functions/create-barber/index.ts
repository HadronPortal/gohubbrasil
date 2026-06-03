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
      barberId,
      email, 
      password, 
      name, 
      phone, 
      bio, 
      avatarUrl,
      barbershopId 
    } = body

    const commissionPct = Number(body.commissionPct ?? body.commission_pct ?? 0)

    // Use caller's barbershop_id if not superadmin
    const targetBarbershopId = callerProfile.role === 'superadmin' ? barbershopId : callerProfile.barbershop_id

    if (!targetBarbershopId) {
      throw new Error('ID da barbearia não fornecido.')
    }

    // 3. Determine userId
    let userId = null

    if (barberId) {
      // Find user_id from barberId
      const { data: barber, error: barberError } = await supabaseAdmin
        .from('barbers')
        .select('user_id')
        .eq('id', barberId)
        .single()
      
      if (barberError || !barber) throw new Error('Barbeiro não encontrado.')
      userId = barber.user_id
    } else if (email) {
      // Check if user already exists in auth.users by email
      const { data: existingUserId } = await supabaseAdmin.rpc("get_auth_user_id_by_email", { 
        p_email: email 
      })
      userId = existingUserId
    }

    if (!userId) {
      if (!email || !password) throw new Error('E-mail e senha são obrigatórios para novo barbeiro.')
      // 4. Create Auth User
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { 
          name: name,
          phone: phone,
          role: 'barber',
          barbershop_id: targetBarbershopId
        }
      })

      if (createError) throw new Error(`Erro ao criar usuário auth: ${createError.message}`)
      userId = newUser.user.id
    } else {
      // 5. Update Existing Auth User
      const updateData: any = {
        user_metadata: {
          name: name,
          phone: phone,
          role: 'barber',
          barbershop_id: targetBarbershopId
        }
      }
      
      if (email) updateData.email = email
      if (password) updateData.password = password

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, updateData)
      if (updateError) console.error("Error updating auth user:", updateError)
    }

    // 6. Upsert public.users
    const { error: userProfileError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        name: name,
        phone: phone,
        role: 'barber',
        barbershop_id: targetBarbershopId,
        avatar_url: avatarUrl || null
      })

    if (userProfileError) throw new Error(`Erro ao atualizar perfil public.users: ${userProfileError.message}`)

    // 7. Upsert public.barbers
    const { data: barberRecord, error: barberEntryError } = await supabaseAdmin
      .from('barbers')
      .upsert({
        user_id: userId,
        barbershop_id: targetBarbershopId,
        bio: bio || null,
        commission_pct: commissionPct || 0,
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
      status: 200,
    })
  }
})