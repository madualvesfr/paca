import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `PACA-${code}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization")!;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Nao autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, couple_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Perfil nao encontrado" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (profile.couple_id) {
      return new Response(JSON.stringify({ error: "Voce ja esta em um casal" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate unique invite code
    let inviteCode: string;
    let attempts = 0;
    do {
      inviteCode = generateCode();
      const { data: existing } = await supabase
        .from("couples")
        .select("id")
        .eq("invite_code", inviteCode)
        .single();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    // Create couple
    const { data: couple, error: coupleError } = await supabase
      .from("couples")
      .insert({
        invite_code: inviteCode,
        created_by: profile.id,
      })
      .select()
      .single();

    if (coupleError) throw coupleError;

    // Link profile to couple
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ couple_id: couple.id })
      .eq("id", profile.id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        couple_id: couple.id,
        invite_code: inviteCode,
        invite_link: `https://pacafinance.app/invite/${inviteCode}`,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao criar casal" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
