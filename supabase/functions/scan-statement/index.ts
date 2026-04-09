import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("couple_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.couple_id) {
      return new Response(JSON.stringify({ error: "No couple found" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { image } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "Image required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: image,
                  },
                },
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
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    const data = await response.json();

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return new Response(JSON.stringify({ error: "Unexpected AI response" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Could not extract data" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Error processing statement" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
