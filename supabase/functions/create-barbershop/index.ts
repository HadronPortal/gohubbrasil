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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if the caller is a super admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error('Invalid token')

    const { data: adminData, error: adminError } = await supabaseClient
      .from('app_admins')
      .select('id')
      .eq('id', user.id)
      .single()

    if (adminError || !adminData) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Only super admins can create barbershops' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { 
      barbershop_name, 
      barbershop_address, 
      barbershop_phone, 
      owner_name, 
      owner_email, 
      owner_phone, 
      owner_password 
    } = await req.json()

    // 1. Create Barbershop
    const { data: barbershop, error: bError } = await supabaseClient
      .from('barbershops')
      .insert({
        name: barbershop_name,
        address: barbershop_address,
        phone: barbershop_phone
      })
      .select()
      .single()

    if (bError) throw bError

    // 2. Create User in Auth
    const { data: authUser, error: aError } = await supabaseClient.auth.admin.createUser({
      email: owner_email,
      password: owner_password,
      email_confirm: true,
      user_metadata: { name: owner_name }
    })

    if (aError) {
      // Cleanup barbershop if auth creation fails
      await supabaseClient.from('barbershops').delete().eq('id', barbershop.id)
      throw aError
    }

    // 3. Create/Update public.users profile
    const { error: pError } = await supabaseClient
      .from('users')
      .upsert({
        id: authUser.user.id,
        name: owner_name,
        phone: owner_phone,
        role: 'owner',
        barbershop_id: barbershop.id
      })

    if (pError) throw pError

    return new Response(JSON.stringify({ 
      barbershop_id: barbershop.id, 
      owner_user_id: authUser.user.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
