import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

type Urgency = "now" | "this_month" | "just_thinking";
type Verdict = "go" | "wait" | "avoid";

interface AdvisorRequest {
  item: string;
  amount: number;           // cents in whatever currency the user picked
  currency: string;         // ISO code
  category_id?: string | null;
  urgency: Urgency;
  notes?: string | null;
  language?: string;        // locale hint so Gemini replies in the user's language
}

// ---- FX helper (same approach as scan functions) ----
async function fetchRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return {};
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates) return {};
    return data.rates as Record<string, number>;
  } catch {
    return {};
  }
}

async function convert(
  amount: number,
  from: string,
  to: string
): Promise<{ converted: number; rate: number }> {
  if (from === to) return { converted: amount, rate: 1 };
  const rates = await fetchRates(from);
  const rate = rates[to];
  if (!rate || !Number.isFinite(rate) || rate <= 0) {
    return { converted: amount, rate: 1 };
  }
  return { converted: Math.round(amount * rate), rate };
}

// ---- Verdict rules: deterministic, AI only explains ----
interface FinancialContext {
  balance_this_month: number;         // income - expense (cents)
  avg_monthly_income: number;         // mean of last 3 months of income
  category_spent_30d: number | null;  // last 30d spent in this category (cents)
  budget_allocated: number | null;    // monthly allocation for this category
  budget_spent_this_month: number | null;
  remaining_bills_this_month: number; // fixed bills still unpaid (cents)
  total_expense_this_month: number;
  total_income_this_month: number;
  couple_currency: string;
}

function computeVerdict(
  amount: number,
  urgency: Urgency,
  ctx: FinancialContext
): { verdict: Verdict; reasons: string[] } {
  const reasons: string[] = [];
  const projectedBalance = ctx.balance_this_month - amount - ctx.remaining_bills_this_month;
  const incomeShare = ctx.avg_monthly_income > 0 ? amount / ctx.avg_monthly_income : 0;
  const budgetUsageAfter =
    ctx.budget_allocated && ctx.budget_allocated > 0
      ? (ctx.budget_spent_this_month ?? 0) + amount >= ctx.budget_allocated
        ? ((ctx.budget_spent_this_month ?? 0) + amount) / ctx.budget_allocated
        : ((ctx.budget_spent_this_month ?? 0) + amount) / ctx.budget_allocated
      : null;

  // Hard NO
  if (projectedBalance < 0) {
    reasons.push("Projected balance goes negative after this purchase + pending bills.");
    return { verdict: "avoid", reasons };
  }
  if (incomeShare > 0.5) {
    reasons.push(
      `Purchase is ${(incomeShare * 100).toFixed(0)}% of your average monthly income.`
    );
    return { verdict: "avoid", reasons };
  }
  if (budgetUsageAfter !== null && budgetUsageAfter >= 1.2) {
    reasons.push(
      `Would push the category budget to ${(budgetUsageAfter * 100).toFixed(0)}% of the limit.`
    );
    return { verdict: "avoid", reasons };
  }

  // Maybe
  const balanceImpact = ctx.balance_this_month > 0 ? amount / ctx.balance_this_month : 1;
  if (balanceImpact > 0.5) {
    reasons.push(
      `Would eat ${(balanceImpact * 100).toFixed(0)}% of this month's remaining balance.`
    );
    return { verdict: "wait", reasons };
  }
  if (incomeShare > 0.2) {
    reasons.push(
      `Purchase is ${(incomeShare * 100).toFixed(0)}% of average monthly income.`
    );
    return { verdict: "wait", reasons };
  }
  if (budgetUsageAfter !== null && budgetUsageAfter > 0.9) {
    reasons.push(
      `Category budget would reach ${(budgetUsageAfter * 100).toFixed(0)}% of the limit.`
    );
    return { verdict: "wait", reasons };
  }
  if (urgency === "just_thinking" && balanceImpact > 0.25) {
    reasons.push("It's a 'just thinking' purchase and it's not a small ticket.");
    return { verdict: "wait", reasons };
  }

  // Green light
  reasons.push("Comfortable margin on balance, income, and category budget.");
  return { verdict: "go", reasons };
}

// ---- Month helpers ----
function startOfMonthISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function endOfMonthISO(d: Date) {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
}
function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Authentication required" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Not authenticated" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, couple_id, display_name")
      .eq("user_id", user.id)
      .single();

    if (!profile?.couple_id) return jsonResponse({ error: "No couple found" }, 403);

    const { data: couple } = await supabase
      .from("couples")
      .select("primary_currency")
      .eq("id", profile.couple_id)
      .single();
    const primaryCurrency: string = (couple?.primary_currency ?? "BRL").toUpperCase();

    const body = (await req.json()) as AdvisorRequest;
    if (!body?.item?.trim() || !body?.amount || body.amount <= 0) {
      return jsonResponse({ error: "Missing item or amount" }, 400);
    }

    const rawAmount = Math.abs(Math.round(body.amount));
    const rawCurrency = (body.currency ?? primaryCurrency).toUpperCase().slice(0, 3) || primaryCurrency;
    const { converted: convertedAmount, rate } = await convert(
      rawAmount,
      rawCurrency,
      primaryCurrency
    );

    // ---- Gather financial context from the last 3 months ----
    const now = new Date();
    const currentMonthStart = startOfMonthISO(now);
    const currentMonthEnd = endOfMonthISO(now);
    const threeMonthsAgo = isoDaysAgo(90);
    const thirtyDaysAgo = isoDaysAgo(30);

    // Transactions this month
    const { data: monthTx } = await supabase
      .from("transactions")
      .select("type, amount, category_id")
      .eq("couple_id", profile.couple_id)
      .gte("date", currentMonthStart)
      .lte("date", currentMonthEnd);

    let totalIncomeThisMonth = 0;
    let totalExpenseThisMonth = 0;
    let categorySpentThisMonth: number | null = null;
    for (const t of monthTx ?? []) {
      if (t.type === "income") totalIncomeThisMonth += t.amount;
      else totalExpenseThisMonth += t.amount;
      if (body.category_id && t.category_id === body.category_id && t.type === "expense") {
        categorySpentThisMonth = (categorySpentThisMonth ?? 0) + t.amount;
      }
    }

    // 3-month income average
    const { data: incomeHistory } = await supabase
      .from("transactions")
      .select("amount, date")
      .eq("couple_id", profile.couple_id)
      .eq("type", "income")
      .gte("date", threeMonthsAgo);
    const totalIncome3m = (incomeHistory ?? []).reduce((s, t) => s + t.amount, 0);
    const avgMonthlyIncome = Math.round(totalIncome3m / 3);

    // Category spent in the last 30 days
    let categorySpent30d: number | null = null;
    if (body.category_id) {
      const { data: catHistory } = await supabase
        .from("transactions")
        .select("amount")
        .eq("couple_id", profile.couple_id)
        .eq("type", "expense")
        .eq("category_id", body.category_id)
        .gte("date", thirtyDaysAgo);
      categorySpent30d = (catHistory ?? []).reduce((s, t) => s + t.amount, 0);
    }

    // Budget for category this month
    const { data: budget } = await supabase
      .from("budgets")
      .select("id, categories:budget_categories(category_id, allocated_amount)")
      .eq("couple_id", profile.couple_id)
      .eq("month", currentMonthStart)
      .maybeSingle();
    let budgetAllocated: number | null = null;
    if (budget && body.category_id) {
      const entry = budget.categories?.find(
        (c: { category_id: string; allocated_amount: number }) => c.category_id === body.category_id
      );
      budgetAllocated = entry?.allocated_amount ?? null;
    }

    // Unpaid fixed bills this month.
    // Bills are templates; bill_payments track per-month state. A bill is
    // still "owed" if there's no bill_payments row for this month OR the row
    // exists but paid=false.
    const { data: allBills } = await supabase
      .from("bills")
      .select("id, amount")
      .eq("couple_id", profile.couple_id);
    const billIds = (allBills ?? []).map((b: { id: string }) => b.id);
    let paidIds = new Set<string>();
    if (billIds.length > 0) {
      const { data: paidRows } = await supabase
        .from("bill_payments")
        .select("bill_id, paid")
        .in("bill_id", billIds)
        .eq("month", currentMonthStart)
        .eq("paid", true);
      paidIds = new Set((paidRows ?? []).map((r: { bill_id: string }) => r.bill_id));
    }
    const remainingBillsThisMonth = (allBills ?? [])
      .filter((b: { id: string }) => !paidIds.has(b.id))
      .reduce((s: number, b: { amount: number }) => s + (b.amount ?? 0), 0);

    const balanceThisMonth = totalIncomeThisMonth - totalExpenseThisMonth;

    const ctx: FinancialContext = {
      balance_this_month: balanceThisMonth,
      avg_monthly_income: avgMonthlyIncome,
      category_spent_30d: categorySpent30d,
      budget_allocated: budgetAllocated,
      budget_spent_this_month: categorySpentThisMonth,
      remaining_bills_this_month: remainingBillsThisMonth,
      total_expense_this_month: totalExpenseThisMonth,
      total_income_this_month: totalIncomeThisMonth,
      couple_currency: primaryCurrency,
    };

    // ---- Verdict (deterministic) ----
    const { verdict, reasons } = computeVerdict(convertedAmount, body.urgency, ctx);

    // ---- Ask Gemini to explain in friend-direct tone ----
    const language = (body.language ?? "pt").slice(0, 2);
    const languageLabel: Record<string, string> = {
      en: "English",
      pt: "Brazilian Portuguese",
      ru: "Russian",
      uk: "Ukrainian",
    };

    const formatNumber = (cents: number) => (cents / 100).toFixed(2);
    const factsForPrompt = `
Couple primary currency: ${primaryCurrency}
Item: ${body.item}
Price: ${formatNumber(convertedAmount)} ${primaryCurrency}${
      rawCurrency !== primaryCurrency
        ? ` (entered as ${formatNumber(rawAmount)} ${rawCurrency})`
        : ""
    }
Urgency: ${body.urgency}
User notes: ${body.notes?.trim() || "(none)"}

Balance this month (income - expense so far): ${formatNumber(balanceThisMonth)} ${primaryCurrency}
Income this month: ${formatNumber(totalIncomeThisMonth)} ${primaryCurrency}
Expenses this month: ${formatNumber(totalExpenseThisMonth)} ${primaryCurrency}
Average monthly income (last 3 months): ${formatNumber(avgMonthlyIncome)} ${primaryCurrency}
Remaining fixed bills this month: ${formatNumber(remainingBillsThisMonth)} ${primaryCurrency}
Category budget: ${budgetAllocated != null ? `${formatNumber(budgetAllocated)} ${primaryCurrency}` : "not set"}
Category spent this month: ${categorySpentThisMonth != null ? `${formatNumber(categorySpentThisMonth)} ${primaryCurrency}` : "n/a"}
Category spent last 30 days: ${categorySpent30d != null ? `${formatNumber(categorySpent30d)} ${primaryCurrency}` : "n/a"}
Balance AFTER this purchase and pending bills: ${formatNumber(balanceThisMonth - convertedAmount - remainingBillsThisMonth)} ${primaryCurrency}

Computed verdict (already decided, do NOT override): ${verdict.toUpperCase()}
Why the verdict came out this way: ${reasons.join(" ")}
`.trim();

    const prompt = `You are a no-nonsense best-friend financial coach in a couple finance app.
Your tone is warm, direct, a little playful, never moralistic, never preachy.
You already know the verdict — you just have to EXPLAIN it in plain language
and suggest one concrete alternative when it helps.

Rules:
- Reply in ${languageLabel[language] ?? "Brazilian Portuguese"}.
- Keep it short: 2 to 4 sentences in "reasoning".
- Reference one or two concrete numbers from the facts (rounded to whole units).
- Never lecture. No "you should be more careful" energy. Treat them like an adult friend.
- If verdict is "go": celebrate briefly and mention the remaining margin.
- If verdict is "wait": explain what would flip it to go (e.g. "wait X days", "skip Y first").
- If verdict is "avoid": be honest but not harsh. Suggest a lighter alternative or timing.
- "alternatives" is optional. Only fill it when you have a SPECIFIC actionable alternative.
  Otherwise leave it empty string.
- Do NOT mention "verdict", "reasoning", "impact" in your answer text — those are structural.
- Return STRICTLY this JSON:
{
  "reasoning": "...",
  "alternatives": ""
}

Facts:
${factsForPrompt}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    const aiData = await response.json();
    let reasoning = "";
    let alternatives = "";

    if (response.ok) {
      const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      try {
        const parsed = JSON.parse(text);
        reasoning = String(parsed.reasoning ?? "").trim();
        alternatives = String(parsed.alternatives ?? "").trim();
      } catch {
        // Fallback — AI replied with plain text. Use it as reasoning.
        reasoning = text.trim();
      }
    } else {
      console.error("Gemini error:", JSON.stringify(aiData));
    }

    // Last-resort fallback so we always show something
    if (!reasoning) {
      reasoning =
        verdict === "go"
          ? "Os números batem: cabe no mês sem apertar as contas."
          : verdict === "wait"
            ? "Não é proibido, mas esse mês ia ficar apertado. Vale esperar um pouco."
            : "Esse mês não dá, não. O saldo ou o orçamento não cobrem essa compra.";
    }

    const impact = {
      balance_now: balanceThisMonth,
      balance_after: balanceThisMonth - convertedAmount - remainingBillsThisMonth,
      remaining_bills: remainingBillsThisMonth,
      income_share_percent: avgMonthlyIncome > 0 ? Math.round((convertedAmount / avgMonthlyIncome) * 100) : null,
      budget_usage_after_percent:
        budgetAllocated && budgetAllocated > 0
          ? Math.round((((categorySpentThisMonth ?? 0) + convertedAmount) / budgetAllocated) * 100)
          : null,
      category_spent_30d: categorySpent30d,
      avg_monthly_income: avgMonthlyIncome,
      primary_currency: primaryCurrency,
    };

    // Persist
    const { data: saved, error: insertError } = await supabase
      .from("purchase_advice")
      .insert({
        couple_id: profile.couple_id,
        asked_by: profile.id,
        item: body.item.trim(),
        amount: convertedAmount,
        currency: primaryCurrency,
        original_amount: rawAmount,
        original_currency: rawCurrency,
        exchange_rate: rate,
        category_id: body.category_id ?? null,
        urgency: body.urgency,
        notes: body.notes?.trim() || null,
        is_shared: false,
        verdict,
        reasoning,
        impact,
        alternatives: alternatives || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("insert advice failed", insertError);
      return jsonResponse({ error: "Could not save advice", details: insertError.message }, 500);
    }

    return jsonResponse(saved);
  } catch (error) {
    console.error("advise-purchase error:", error);
    return jsonResponse({ error: "Error generating advice", details: String(error) }, 500);
  }
});
