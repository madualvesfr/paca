import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

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
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Autenticacao obrigatoria" }), {
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
      return new Response(JSON.stringify({ error: "Usuario nao autenticado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Verify user has a couple
    const { data: profile } = await supabase
      .from("profiles")
      .select("couple_id")
      .eq("user_id", user.id)
      .single();

    if (!profile?.couple_id) {
      return new Response(JSON.stringify({ error: "Usuario nao pertence a um casal" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { image } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "Imagem obrigatoria" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: image,
                },
              },
              {
                type: "text",
                text: `Analise esta imagem de comprovante/recibo/notificacao de pagamento.
Extraia as seguintes informacoes e retorne APENAS um JSON valido:
{
  "amount": numero em centavos (ex: 1500 para R$15,00),
  "description": "nome do estabelecimento ou descricao",
  "category": "uma das: Alimentacao, Transporte, Moradia, Lazer, Saude, Educacao, Compras, Entretenimento, Outros",
  "date": "YYYY-MM-DD",
  "type": "expense" ou "income",
  "confidence": numero de 0 a 1 indicando confianca na extracao
}
Se nao conseguir identificar algum campo, use null.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data.content?.[0]?.text) {
      return new Response(JSON.stringify({ error: "Resposta inesperada da IA" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const text = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Nao foi possivel extrair dados" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Erro ao processar imagem" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
