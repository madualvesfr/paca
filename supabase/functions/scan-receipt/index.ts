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

async function fetchRates(base: string): Promise<Record<string, number>> {
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!res.ok) return {};
    const data = await res.json();
    if (data?.result !== "success" || !data?.rates) return {};
    return data.rates as Record<string, number>;
  } catch (err) {
    console.error("FX fetch failed for base", base, err);
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
      .select("id, couple_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.couple_id) return jsonResponse({ error: "No couple found" }, 403);

    const { data: couple } = await supabase
      .from("couples")
      .select("primary_currency")
      .eq("id", profile.couple_id)
      .single();
    const primaryCurrency: string = (couple?.primary_currency ?? "BRL").toUpperCase();

    const { image } = await req.json();
    if (!image) return jsonResponse({ error: "Image required" }, 400);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: "image/png", data: image } },
                {
                  text: `Analyze this receipt/payment proof/payment notification image.
Today's date is ${new Date().toISOString().split("T")[0]}.
Extract the following information and return ONLY a valid JSON:
{
  "amount": number in cents, ALWAYS POSITIVE (e.g. 1500 for 15.00 - never negative, use "type" to distinguish),
  "currency": "ISO 4217 code of the currency (e.g. BRL, USD, EUR, GBP, UAH, RUB, ARS, MXN, JPY). Detect it from symbols (R$ = BRL, $ = USD unless another country context is clear, € = EUR, £ = GBP, ₴ = UAH, ₽ = RUB, ¥ = JPY or CNY depending on context) or from text. Default to BRL if truly unknown.",
  "description": "store name or description",
  "category": "one of: Alimentacao, Transporte, Moradia, Lazer, Saude, Educacao, Compras, Entretenimento, Outros",
  "date": "YYYY-MM-DD - if the year is not visible, use the current year (${new Date().getFullYear()}). Never assume a past year.",
  "type": "expense" or "income",
  "confidence": number from 0 to 1 indicating extraction confidence
}

CRITICAL rules for classifying "type":
- REFUNDS, REIMBURSEMENTS, CHARGEBACKS and REVERSALS are INCOME, not expenses.
  Detect these keywords anywhere in the image (case-insensitive, any language):
  "reembolso", "estorno", "devolução", "devolucao", "cashback", "refund",
  "reversal", "chargeback", "возврат", "повернення", "restituição", "crédito de estorno".
  These represent money RETURNING to the user, so type = "income".
- A receipt/proof for a PURCHASE = "expense"
- A receipt/proof for a REFUND or money RECEIVED (Pix received, deposit, salary) = "income"
- If the image clearly shows a refund of a previous purchase, set type = "income"
  and keep the original merchant name in description, optionally prefixed with
  "Reembolso: ".

CRITICAL: CANCELLED OR DENIED TRANSACTIONS MUST NOT BE EXTRACTED.
- If the image clearly shows the transaction was CANCELLED, DENIED, REFUSED,
  FAILED, NOT AUTHORIZED, REJECTED, or otherwise did not complete — return
  an error response with all fields set to null and confidence 0. The money
  did not move, so there is nothing to record.
- Keywords indicating the transaction FAILED (any language, case-insensitive):
  "cancelado", "cancelada", "cancelled", "canceled",
  "negado", "negada", "denied", "recusado", "recusada", "declined",
  "não autorizado", "nao autorizado", "not authorized", "unauthorized",
  "falhou", "falha", "failed", "failure",
  "rejeitado", "rejeitada", "rejected",
  "отменено", "отклонено", "скасовано", "відхилено".
- Also skip if the image is a screenshot of a pending payment that was
  never confirmed, or an authorization hold that was released.
- When in doubt, set confidence low rather than fabricating a completed
  transaction.

If you cannot identify a field, use null.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return jsonResponse({ error: "AI service error", details: data.error?.message }, 502);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Unexpected AI response:", JSON.stringify(data));
      return jsonResponse({ error: "Unexpected AI response", details: data }, 502);
    }

    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("Could not extract JSON from:", text);
        return jsonResponse({ error: "Could not extract data", raw: text }, 422);
      }
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("JSON parse failed:", e, "raw:", text);
        return jsonResponse({ error: "Invalid JSON from AI", raw: text }, 422);
      }
    }

    if (!parsed || parsed.amount == null) {
      // Nothing to convert — return as is (will be filtered client-side)
      return jsonResponse(parsed ?? {});
    }

    const rawAmount = Math.abs(Number(parsed.amount) || 0);
    const rawCurrency = String(parsed.currency ?? primaryCurrency)
      .toUpperCase()
      .slice(0, 3) || primaryCurrency;

    const { converted, rate } = await convert(rawAmount, rawCurrency, primaryCurrency);

    // Log usage (fire-and-forget — don't block the response on it)
    supabase
      .from("usage_stats")
      .insert({
        profile_id: profile.id,
        couple_id: profile.couple_id,
        action: "scan_receipt",
        metadata: {
          currency: rawCurrency,
          primary_currency: primaryCurrency,
          confidence: parsed.confidence ?? null,
          converted: rawCurrency !== primaryCurrency,
        },
      })
      .then((res: { error: unknown }) => {
        if (res.error) console.error("usage log failed:", res.error);
      });

    return jsonResponse({
      ...parsed,
      amount: converted,
      currency: primaryCurrency,
      original_amount: rawAmount,
      original_currency: rawCurrency,
      exchange_rate: rate,
    });
  } catch (error) {
    console.error("scan-receipt error:", error);
    return jsonResponse({ error: "Error processing image", details: String(error) }, 500);
  }
});
