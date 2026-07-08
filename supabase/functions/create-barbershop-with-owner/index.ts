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
      return new Response(JSON.stringify({ success: false, error: 'Apenas superadmins podem criar estabelecimentos.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // Returning 200 as requested
      })
    }

    const body = await req.json()
    const { 
      barbershopName, 
      barbershopAddress, 
      barbershopPhone, 
      logoUrl, 
      description,
      paymentStatus,
      paymentDueDate,
      subscriptionStatus,
      monthlyPrice,
      paidUntil,
      ownerName, 
      ownerEmail, 
      ownerPhone, 
      ownerPassword,
      ownerIsBarber: rawOwnerIsBarber,
      categoryId,
      categoryIds: rawCategoryIds
    } = body

    const categoryIds = Array.from(new Set(
      [categoryId, ...(Array.isArray(rawCategoryIds) ? rawCategoryIds : [])]
        .filter((value): value is string => typeof value === 'string' && value.length > 0)
    ));

    const ownerIsBarber =
      rawOwnerIsBarber === true ||
      rawOwnerIsBarber === "true" ||
      rawOwnerIsBarber === "on";

    console.log("OWNER IS BARBER DEBUG", { ownerIsBarber, raw: rawOwnerIsBarber });

    // 3. Check if user already exists in auth.users
    const { data: existingUserId, error: rpcError } = await supabaseAdmin.rpc("get_auth_user_id_by_email", { 
      p_email: ownerEmail 
    })

    if (rpcError) {
      console.error("Error checking existing user:", rpcError)
    }

    let ownerUserId = existingUserId;

    // 4. Create or Re-use user
    if (!ownerUserId) {
      console.log("Creating new auth user for", ownerEmail);
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: ownerEmail,
        password: ownerPassword,
        email_confirm: true,
        user_metadata: { 
          name: ownerName,
          phone: ownerPhone,
          role: 'owner'
        }
      })

      if (createError) {
        return new Response(JSON.stringify({ success: false, error: `Erro ao criar usuário: ${createError.message}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      ownerUserId = newUser.user.id;
    } else {
      console.log("Re-using existing auth user", ownerUserId, "for", ownerEmail);
      // We'll update the password and metadata later once we have the barbershop_id
    }

    // 5. Generate slug and Create Barbershop
    const slug = barbershopName
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const { data: barbershop, error: bError } = await supabaseAdmin
      .from('barbershops')
      .insert({
        name: barbershopName,
        address: barbershopAddress,
        phone: barbershopPhone,
        logo_url: logoUrl,
        description: description,
        payment_status: paymentStatus || "pending",
        payment_due_date: paymentDueDate || paidUntil || null,
        subscription_status: subscriptionStatus || "trialing",
        monthly_price: Number(monthlyPrice) || 0,
        paid_until: paidUntil || null,
        slug: slug,
        category_id: categoryId || null
      })
      .select()
      .single()

    if (bError) {
      return new Response(JSON.stringify({ success: false, error: `Erro ao criar estabelecimento: ${bError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (categoryIds.length > 0) {
      const { error: categoriesError } = await supabaseAdmin
        .from('barbershop_categories')
        .upsert(
          categoryIds.map((selectedCategoryId) => ({
            barbershop_id: barbershop.id,
            category_id: selectedCategoryId,
          })),
          { onConflict: 'barbershop_id,category_id' }
        );

      if (categoriesError) {
        console.error('Error linking establishment categories:', categoriesError);
      }
    }

    // 6. Update Auth User Metadata with barbershop_id
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(ownerUserId, {
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        name: ownerName,
        phone: ownerPhone,
        role: "owner",
        barbershop_id: barbershop.id
      }
    })

    if (updateError) {
      console.error("Error updating auth user metadata:", updateError)
      // We continue since the barbershop is already created, but this is worth logging
    }

    // 7. Upsert public.users profile for owner
    const { error: pError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: ownerUserId,
        name: ownerName,
        phone: ownerPhone,
        role: 'owner',
        barbershop_id: barbershop.id,
        avatar_url: null
      })

    if (pError) {
      return new Response(JSON.stringify({ success: false, error: `Erro ao atualizar perfil: ${pError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 8. If owner is also a barber, create barber record using RPC
    if (ownerIsBarber) {
      const { data: barberData, error: barberError } = await supabaseAdmin.rpc(
        "ensure_owner_is_barber",
        {
          p_owner_user_id: ownerUserId,
          p_barbershop_id: barbershop.id,
        }
      );

      if (barberError || barberData?.success === false) {
        console.error("Error creating barber record:", barberError || barberData?.error);
        // We don't fail the whole request but we could inform the user
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      barbershop_id: barbershop.id, 
      owner_user_id: ownerUserId 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  }
})
