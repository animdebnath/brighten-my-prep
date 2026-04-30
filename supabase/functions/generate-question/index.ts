import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { subject, topic, difficulty, recentTopics } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `You are SmartPrep AI, an adaptive exam tutor. Generate ONE high-quality multiple-choice question.
Difficulty levels: easy, medium, hard. Match the requested difficulty exactly.
Return via the emit_question tool only.`;
    const user = `Subject: ${subject}
Topic: ${topic}
Difficulty: ${difficulty}
Avoid these recently asked topics if possible: ${(recentTopics || []).join(", ") || "none"}
Generate a fresh question with 4 plausible options.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "emit_question",
            description: "Return one MCQ",
            parameters: {
              type: "object",
              properties: {
                question: { type: "string" },
                options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                correct_answer: { type: "string", description: "Must exactly match one of the options" },
                topic: { type: "string" },
                concept_hint: { type: "string", description: "1-line concept this tests" },
              },
              required: ["question", "options", "correct_answer", "topic", "concept_hint"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_question" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit, please wait." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace > Usage." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }
    const data = await resp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) throw new Error("No tool call returned");
    const args = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(args), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
