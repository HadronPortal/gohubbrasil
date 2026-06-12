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

type QueueItem = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  path: string | null;
  type: string;
  data: Record<string, unknown> | null;
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

function toFirebaseData(data: Record<string, unknown>, path: string, type: string) {
  const result: Record<string, string> = {
    path,
    type,
  };

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) {
      continue;
    }

    result[key] = typeof value === "string" ? value : JSON.stringify(value);
  }

  return result;
}

function isInvalidFirebaseToken(result: any) {
  const message = String(result?.error?.message || "");
  const status = String(result?.error?.status || "");
  const details = Array.isArray(result?.error?.details) ? result.error.details : [];
  const errorCode = details
    .map((detail: any) => String(detail?.errorCode || detail?.error_code || ""))
    .find(Boolean);

  return status === "NOT_FOUND" ||
    status === "INVALID_ARGUMENT" ||
    errorCode === "UNREGISTERED" ||
    errorCode === "INVALID_ARGUMENT" ||
    message.includes("Requested entity was not found") ||
    message.includes("registration token is not a valid FCM");
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
    let callerId = body.user_id as string | undefined;
    let callerRole = isServiceRoleCall ? "service_role" : null;

    if (!isServiceRoleCall) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        throw new Error("Token invalido");
      }

      callerId = user.id;

      const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (callerProfileError) {
        throw callerProfileError;
      }

      callerRole = callerProfile?.role ?? null;
    }

    const canSendToOthers = isServiceRoleCall || callerRole === "superadmin";
    const serviceAccount = getFirebaseServiceAccount();
    const accessToken = await createFirebaseAccessToken(serviceAccount);

    const sendToUser = async (params: {
      userId: string;
      title: string;
      messageBody: string;
      path: string;
      type: string;
      data: Record<string, unknown>;
      queueId?: string;
    }) => {
      const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
        .from("users")
        .select("id, push_token")
        .eq("id", params.userId)
        .maybeSingle();

      if (targetProfileError) {
        throw targetProfileError;
      }

      if (!targetProfile?.push_token) {
        return {
          success: false,
          user_id: params.userId,
          error: "Usuario sem push_token salvo",
        };
      }

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
                title: params.title,
                body: params.messageBody,
              },
              data: toFirebaseData(params.data, params.path, params.type),
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
        if (isInvalidFirebaseToken(result)) {
          await supabaseAdmin
            .from("users")
            .update({ push_token: null })
            .eq("id", params.userId)
            .eq("push_token", targetProfile.push_token);
        }

        return {
          success: false,
          user_id: params.userId,
          error: result?.error?.message || "Erro ao enviar push",
          firebase_result: result,
        };
      }

      return {
        success: true,
        user_id: params.userId,
        firebase_result: result,
      };
    };

    const processQueue = async (limit: number) => {
      if (!isServiceRoleCall && callerRole !== "superadmin") {
        throw new Error("Sem permissao para processar fila de push");
      }

      if (body.job === "daily") {
        await supabaseAdmin.rpc("enqueue_haircut_return_reminders").throwOnError();
        await supabaseAdmin.rpc("enqueue_subscription_due_reminders").throwOnError();
      }

      const { data: queueItems, error: claimError } = await supabaseAdmin.rpc(
        "claim_pending_push_notifications",
        { p_limit: limit },
      );

      if (claimError) {
        throw claimError;
      }

      const results = [];

      for (const item of (queueItems ?? []) as QueueItem[]) {
        const itemData = item.data || {};
        const result = await sendToUser({
          userId: item.user_id,
          title: item.title,
          messageBody: item.body,
          path: item.path || "/",
          type: item.type,
          data: {
            ...itemData,
            queue_id: item.id,
            appointment_id: itemData.appointment_id,
          },
          queueId: item.id,
        });

        if (result.success) {
          await supabaseAdmin
            .from("push_notification_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              firebase_message_id: result.firebase_result?.name ?? null,
              last_error: null,
            })
            .eq("id", item.id);
        } else {
          await supabaseAdmin
            .from("push_notification_queue")
            .update({
              status: "failed",
              last_error: result.error,
            })
            .eq("id", item.id);
        }

        results.push({ queue_id: item.id, ...result });
      }

      return results;
    };

    if (body.process_queue || body.job === "daily") {
      const limit = Math.max(1, Math.min(Number(body.limit || 25), 100));
      const results = await processQueue(limit);

      return jsonResponse({
        success: true,
        mode: body.job === "daily" ? "daily" : "process_queue",
        processed: results.length,
        results,
      });
    }

    let rawUserIds = Array.isArray(body.user_ids)
      ? body.user_ids
      : body.user_id
        ? [body.user_id]
        : callerId
          ? [callerId]
          : [];

    if (isServiceRoleCall && rawUserIds.length === 0) {
      const { data: firstProfile, error: firstProfileError } = await supabaseAdmin
        .from("users")
        .select("id")
        .not("push_token", "is", null)
        .limit(1)
        .maybeSingle();

      if (firstProfileError) {
        throw firstProfileError;
      }

      rawUserIds = firstProfile?.id ? [firstProfile.id] : [];
    }

    const userIds = [...new Set(rawUserIds.filter(Boolean).map(String))];

    if (!userIds.length) {
      throw new Error("Informe user_id ou user_ids");
    }

    if (!canSendToOthers && userIds.some((userId) => userId !== callerId)) {
      throw new Error("Sem permissao para enviar push para outro usuario");
    }

    const title = String(body.title || "GoHub");
    const messageBody = String(body.body || "Voce recebeu uma nova notificacao.");
    const path = String(body.path || "/");
    const type = String(body.type || "manual");
    const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;

    const results = [];

    for (const userId of userIds) {
      results.push(await sendToUser({
        userId,
        title,
        messageBody,
        path,
        type,
        data,
      }));
    }

    return jsonResponse({
      success: results.some((result) => result.success),
      results,
    });
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : typeof error === "object"
        ? JSON.stringify(error)
        : String(error);

    console.error("send-push error:", message);

    return jsonResponse({
      success: false,
      error: message,
    });
  }
});
