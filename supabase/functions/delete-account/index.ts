import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing auth" }, 401);

    // User-context client just to identify the caller; never trust the body.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Not authenticated" }, 401);

    // Service-role client for the privileged work.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("id, couple_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      // No profile → just delete the auth user and call it done.
      await admin.auth.admin.deleteUser(user.id);
      return jsonResponse({ ok: true });
    }

    // 1) Personal transactions need an explicit delete: paid_by FK is ON DELETE
    //    SET NULL (so couple txns survive), but personal rows should vanish.
    await admin
      .from("transactions")
      .delete()
      .eq("scope", "personal")
      .eq("paid_by", profile.id);

    // 2) Personal budgets and categories cascade-delete via owner_id when the
    //    profile is deleted (ON DELETE CASCADE — added in migration 00015).
    //    purchase_advice (asked_by) and usage_stats (profile_id) also cascade.
    //    notifications (target_user_id) cascade after migration 00017.

    // 3) Drop the auth user. This cascades through profiles.user_id and
    //    triggers the cascades above.
    const coupleId = profile.couple_id;
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("auth.admin.deleteUser failed", deleteError);
      return jsonResponse({ error: "Failed to delete user" }, 500);
    }

    // 4) If the user was in a couple and is the last member, drop the couple
    //    so its data doesn't sit forever orphaned.
    if (coupleId) {
      const { count } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("couple_id", coupleId);
      if ((count ?? 0) === 0) {
        await admin.from("couples").delete().eq("id", coupleId);
      }
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("delete-account error", err);
    return jsonResponse({ error: "Server error" }, 500);
  }
});
