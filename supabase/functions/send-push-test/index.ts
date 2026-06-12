import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function base64Url(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

async function createFirebaseAccessToken(serviceAccount: FirebaseServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );
  const jwt = `${unsignedToken}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Firebase access token error:", data);
    throw new Error("Nao foi possivel autenticar no Firebase");
  }

  return data.access_token as string;
}

function getFirebaseServiceAccount(): FirebaseServiceAccount {
  const rawBase64 = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_BASE64");

  if (rawBase64) {
    const serviceAccount = JSON.parse(atob(rawBase64)) as FirebaseServiceAccount;

    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_BASE64 invalida");
    }

    return serviceAccount;
  }

  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");

  if (!raw) {
    throw new Error("Secret FIREBASE_SERVICE_ACCOUNT_BASE64 nao configurada");
  }

  const serviceAccount = JSON.parse(raw) as FirebaseServiceAccount;

  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT invalida");
  }

  return serviceAccount;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isServiceRoleCall = token === serviceRoleKey;
    let caller: { id: string } | null = null;

    if (isServiceRoleCall) {
      caller = { id: body.user_id };
    } else {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        throw new Error("Token invalido");
      }

      caller = user;
    }

    let targetUserId = body.user_id || caller.id;
    const title = body.title || "GoHub";
    const messageBody = body.body || "Notificacao push funcionando no app.";
    const path = body.path || "/";

    const { data: callerProfile, error: callerProfileError } = isServiceRoleCall
      ? { data: { role: "superadmin" }, error: null }
      : await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", caller.id)
        .maybeSingle();

    if (callerProfileError) {
      throw callerProfileError;
    }

    const isSuperAdmin = callerProfile?.role === "superadmin";

    if (targetUserId !== caller.id && !isSuperAdmin) {
      throw new Error("Sem permissao para enviar push para outro usuario");
    }

    let targetProfile = null;
    let targetProfileError = null;

    if (targetUserId) {
      const result = await supabaseAdmin
        .from("users")
        .select("id, push_token")
        .eq("id", targetUserId)
        .maybeSingle();

      targetProfile = result.data;
      targetProfileError = result.error;
    } else if (isServiceRoleCall) {
      const result = await supabaseAdmin
        .from("users")
        .select("id, push_token")
        .not("push_token", "is", null)
        .limit(1)
        .maybeSingle();

      targetProfile = result.data;
      targetProfileError = result.error;
      targetUserId = targetProfile?.id;
    }

    if (targetProfileError) {
      throw new Error(JSON.stringify(targetProfileError));
    }

    if (!targetProfile?.push_token) {
      throw new Error("Usuario sem push_token salvo");
    }

    const serviceAccount = getFirebaseServiceAccount();
    const accessToken = await createFirebaseAccessToken(serviceAccount);

    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token: targetProfile.push_token,
            notification: {
              title,
              body: messageBody,
            },
            data: {
              path: String(path),
              type: "test",
            },
            android: {
              priority: "HIGH",
              notification: {
                icon: "ic_stat_gohub",
                color: "#119CFF",
                sound: "default",
                channel_id: "gohub_alerts_v2",
              },
            },
          },
        }),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Firebase send error:", result);
      throw new Error(result?.error?.message || "Erro ao enviar push");
    }

    return new Response(JSON.stringify({
      success: true,
      target_user_id: targetUserId,
      firebase_result: result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object"
        ? JSON.stringify(error)
        : String(error);
    console.error("send-push-test error:", message);

    return new Response(JSON.stringify({
      success: false,
      error: message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
