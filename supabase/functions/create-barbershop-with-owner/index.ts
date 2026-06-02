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

    // 2. Check if caller is superadmin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (profileError || callerProfile?.role !== 'superadmin') {
      return new Response(JSON.stringify({ error: 'Apenas superadmins podem criar barbearias.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    const { 
      barbershopName, 
      barbershopAddress, 
      barbershopPhone, 
      logoUrl, 
      description,
      ownerName, 
      ownerEmail, 
      ownerPhone, 
      ownerPassword 
    } = await req.json()

    // Generate slug
    const slug = barbershopName
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // 4. Create Barbershop
    const { data: barbershop, error: bError } = await supabaseAdmin
      .from('barbershops')
      .insert({
        name: barbershopName,
        address: barbershopAddress,
        phone: barbershopPhone,
        logo_url: logoUrl,
        description: description,
        slug: slug
      })
      .select()
      .single()

    if (bError) throw bError

    // 5. Create Owner in Auth
    const { data: authUser, error: aError } = await supabaseAdmin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: { 
        name: ownerName,
        phone: ownerPhone,
        role: 'owner',
        barbershop_id: barbershop.id
      }
    })

    if (aError) {
      // Cleanup barbershop if auth creation fails
      await supabaseAdmin.from('barbershops').delete().eq('id', barbershop.id)
      throw aError
    }

    // 6. Create/Update public.users profile for owner
    // We use upsert to ensure it overrides any trigger that might have created it as a client
    const { error: pError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.user.id,
        name: ownerName,
        phone: ownerPhone,
        role: 'owner',
        barbershop_id: barbershop.id,
        avatar_url: null
      })

    if (pError) {
      // Cleanup if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      await supabaseAdmin.from('barbershops').delete().eq('id', barbershop.id)
      throw pError
    }

    return new Response(JSON.stringify({ 
      success: true,
      barbershop_id: barbershop.id, 
      owner_user_id: authUser.user.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
