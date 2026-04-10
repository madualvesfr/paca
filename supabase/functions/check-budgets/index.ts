import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    // Get all budgets for the current month
    const { data: budgets } = await supabase
      .from("budgets")
      .select(`
        id, couple_id, total_amount,
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
      // Get total spent this month for this couple
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount, category_id")
        .eq("couple_id", budget.couple_id)
        .eq("type", "expense")
        .gte("date", currentMonth)
        .lt("date", nextMonth(currentMonth));

      if (!transactions) continue;

      const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
      const ratio = totalSpent / budget.total_amount;

      // Get couple members for notifications
      const { data: members } = await supabase
        .from("profiles")
        .select("id")
        .eq("couple_id", budget.couple_id);

      if (!members) continue;

      // Alert at 80%
      if (ratio >= 0.8 && ratio < 1.0) {
        for (const member of members) {
          await supabase.from("notifications").insert({
            couple_id: budget.couple_id,
            target_user_id: member.id,
            type: "budget_alert",
            title: "Orçamento quase no limite!",
            body: `Vocês já gastaram ${Math.round(ratio * 100)}% do orçamento do mês.`,
          });
          alertsSent++;
        }
      }

      // Alert at 100%
      if (ratio >= 1.0) {
        for (const member of members) {
          await supabase.from("notifications").insert({
            couple_id: budget.couple_id,
            target_user_id: member.id,
            type: "budget_alert",
            title: "Orçamento estourado!",
            body: `O orçamento do mês foi ultrapassado (${Math.round(ratio * 100)}%).`,
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
