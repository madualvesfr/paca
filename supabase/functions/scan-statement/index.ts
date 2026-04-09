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
      .select("couple_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.couple_id) return jsonResponse({ error: "No couple found" }, 403);

    const { image } = await req.json();
    if (!image) return jsonResponse({ error: "Image required" }, 400);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: "image/png", data: image } },
                {
                  text: `Analyze this bank statement image.
Identify ALL visible transactions and return ONLY a valid JSON:
{
  "transactions": [
    {
      "amount": number in cents (e.g. 1500 for $15.00),
      "description": "transaction description",
      "category": "one of: Alimentacao, Transporte, Moradia, Lazer, Saude, Educacao, Compras, Entretenimento, Outros",
      "date": "YYYY-MM-DD",
      "type": "expense" or "income",
      "confidence": number from 0 to 1
    }
  ]
}`,
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return jsonResponse({ error: "AI service error", details: data.error?.message }, 502);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return jsonResponse({ error: "Unexpected AI response" }, 502);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return jsonResponse({ error: "Could not extract data" }, 422);

    return jsonResponse(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error("scan-statement error:", error);
    return jsonResponse({ error: "Error processing statement" }, 500);
  }
});
