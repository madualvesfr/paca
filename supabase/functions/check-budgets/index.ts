import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { budgetAlert, resolveLang } from "../_shared/i18n.ts";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Get all budgets for the current month (couple + personal)
    const { data: budgets } = await supabase
      .from("budgets")
      .select(`
        id, couple_id, scope, owner_id, total_amount,
        categories:budget_categories(category_id, allocated_amount)
      `)
      .eq("month", currentMonth);

    if (!budgets || budgets.length === 0) {
      return new Response(JSON.stringify({ checked: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    let alertsSent = 0;

    for (const budget of budgets) {
      const isPersonal = budget.scope === "personal";

      // Sum transactions matching this budget's scope (and owner for personal).
      let txQuery = supabase
        .from("transactions")
        .select("amount, category_id")
        .eq("couple_id", budget.couple_id)
        .eq("scope", budget.scope ?? "couple")
        .eq("type", "expense")
        .gte("date", currentMonth)
        .lt("date", nextMonth(currentMonth));
      if (isPersonal && budget.owner_id) {
        txQuery = txQuery.eq("paid_by", budget.owner_id);
      }
      const { data: transactions } = await txQuery;
      if (!transactions) continue;

      const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const ratio = totalSpent / budget.total_amount;

      // Personal budgets notify only the owner; couple budgets notify both.
      // We also load each recipient's `language` so the notification can be
      // localized per-user via resolveLang/budgetAlert (../_shared/i18n.ts).
      let recipients: { id: string; language?: string | null }[] = [];
      if (isPersonal && budget.owner_id) {
        const { data: owner } = await supabase
          .from("profiles")
          .select("id, language")
          .eq("id", budget.owner_id)
          .single();
        // Fall back to a bare id so we still notify the owner if the lookup fails.
        recipients = owner ? [owner] : [{ id: budget.owner_id }];
      } else {
        const { data: members } = await supabase
          .from("profiles")
          .select("id, language")
          .eq("couple_id", budget.couple_id);
        recipients = members ?? [];
      }
      if (recipients.length === 0) continue;

      const pct = Math.round(ratio * 100);

      // Alert at 80%
      if (ratio >= 0.8 && ratio < 1.0) {
        for (const member of recipients) {
          const lang = resolveLang(member.language);
          const { title, body } = budgetAlert(
            lang,
            isPersonal ? "nearPersonal" : "nearCouple",
            pct
          );
          await supabase.from("notifications").insert({
            couple_id: budget.couple_id,
            target_user_id: member.id,
            type: "budget_alert",
            title,
            body,
          });
          alertsSent++;
        }
      }

      // Alert at 100%
      if (ratio >= 1.0) {
        for (const member of recipients) {
          const lang = resolveLang(member.language);
          const { title, body } = budgetAlert(
            lang,
            isPersonal ? "exceededPersonal" : "exceededCouple",
            pct
          );
          await supabase.from("notifications").insert({
            couple_id: budget.couple_id,
            target_user_id: member.id,
            type: "budget_alert",
            title,
            body,
          });
          alertsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ checked: budgets.length, alerts_sent: alertsSent }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao verificar orçamentos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function nextMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-").map(Number);
  const nextDate = new Date(year, month, 1); // month is already 1-based, so passing it as-is gives us next month
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-01`;
}
