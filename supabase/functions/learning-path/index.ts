import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { weakTopics, subjectStats, accuracy, streak, total } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const sys = `You are SmartPrep AI's learning-path coach. Design a personalized, realistic study plan for a student preparing for exams.
Ground every suggestion in the performance data provided. Prioritize the weakest topics first, keep daily workloads small and achievable (2-4 tasks), and make tasks specific (concepts, question types, practice counts).
Return via the emit_plan tool only.`;

    const user = `Student performance:
- Overall accuracy: ${accuracy}% over ${total} questions
- Current study streak: ${streak} day(s)
- Subject mastery: ${(subjectStats || []).map((s: any) => `${s.subject}: ${s.mastery}% (${s.total}q)`).join("; ") || "no data yet"}
- Weakest topics: ${(weakTopics || []).join(", ") || "none identified yet"}

Generate a 7-day adaptive study plan with focus areas and daily tasks.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        tools: [{
          type: "function",
          function: {
            name: "emit_plan",
            description: "Return a personalized 7-day study plan",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence diagnosis of where the student stands" },
                focus_areas: {
                  type: "array",
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      subject: { type: "string" },
                      topic: { type: "string" },
                      reason: { type: "string", description: "Why this needs focus, grounded in the data" },
                    },
                    required: ["subject", "topic", "reason"],
                    additionalProperties: false,
                  },
                },
                daily_plan: {
                  type: "array",
                  minItems: 7,
                  maxItems: 7,
                  items: {
                    type: "object",
                    properties: {
                      day: { type: "integer", description: "1-7" },
                      focus: { type: "string", description: "Short theme for the day" },
                      tasks: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
                    },
                    required: ["day", "focus", "tasks"],
                    additionalProperties: false,
                  },
                },
                motivation: { type: "string", description: "One encouraging sentence" },
              },
              required: ["summary", "focus_areas", "daily_plan", "motivation"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_plan" } },
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
