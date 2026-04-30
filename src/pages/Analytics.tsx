import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

type Attempt = { is_correct: boolean; topic: string; subject: string; difficulty: string; created_at: string; response_ms: number };

export default function Analytics() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("attempts").select("is_correct,topic,subject,difficulty,created_at,response_ms")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setAttempts((data as Attempt[]) ?? []));
  }, [user]);

  const total = attempts.length;
  const correct = attempts.filter(a => a.is_correct).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const avgMs = total ? Math.round(attempts.reduce((s, a) => s + a.response_ms, 0) / total) : 0;

  // By subject
  const subjMap = new Map<string, { c: number; t: number }>();
  attempts.forEach(a => { const x = subjMap.get(a.subject) ?? { c: 0, t: 0 }; x.t++; if (a.is_correct) x.c++; subjMap.set(a.subject, x); });
  const subjData = [...subjMap.entries()].map(([name, v]) => ({ name, mastery: Math.round((v.c / v.t) * 100), total: v.t }));

  // Topic heatmap
  const topicMap = new Map<string, { c: number; t: number }>();
  attempts.forEach(a => { const x = topicMap.get(a.topic) ?? { c: 0, t: 0 }; x.t++; if (a.is_correct) x.c++; topicMap.set(a.topic, x); });
  const topicData = [...topicMap.entries()].map(([t, v]) => ({ topic: t, mastery: Math.round((v.c / v.t) * 100), total: v.t }))
    .sort((a, b) => b.total - a.total).slice(0, 24);

  const probability = Math.min(99, Math.round(accuracy * 0.9 + Math.min(20, total) * 0.5));

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-up">
      <div>
        <div className="text-sm text-muted-foreground">Analytics</div>
        <h1 className="font-display text-3xl font-bold">Your <span className="text-gradient">learning intelligence</span></h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { l: "Questions", v: total },
          { l: "Accuracy", v: `${accuracy}%` },
          { l: "Avg time", v: `${(avgMs / 1000).toFixed(1)}s` },
          { l: "Pass probability", v: `${probability}%` },
        ].map(s => (
          <div key={s.l} className="glass rounded-2xl p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.l}</div>
            <div className="font-display text-2xl font-bold mt-2 text-gradient">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="font-semibold mb-3">Mastery by subject</h3>
          {subjData.length === 0 ? <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">No data yet.</div> :
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={subjData}>
                <defs>
                  <linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(265 90% 66%)" />
                    <stop offset="100%" stopColor="hsl(188 95% 55%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(232 25% 18%)" />
                <XAxis dataKey="name" stroke="hsl(220 15% 60%)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="hsl(220 15% 60%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(232 30% 10%)", border: "1px solid hsl(232 25% 18%)", borderRadius: 12 }} />
                <Bar dataKey="mastery" fill="url(#bg1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          }
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Predicted exam score</h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: "p", value: probability, fill: "hsl(265 90% 66%)" }]} startAngle={90} endAngle={-270}>
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "hsl(232 25% 18%)" }} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="text-center -mt-44 font-display text-4xl font-bold text-gradient">{probability}%</div>
          <div className="text-center text-xs text-muted-foreground mt-32">Probability of passing</div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-4">Topic mastery heatmap</h3>
        {topicData.length === 0 ? <div className="text-sm text-muted-foreground">Practice more topics to populate the heatmap.</div> :
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {topicData.map(t => {
              const intensity = t.mastery / 100;
              const bg = `linear-gradient(135deg, hsl(265 90% ${30 + intensity * 35}%), hsl(188 95% ${30 + intensity * 30}%))`;
              return (
                <div key={t.topic} className="rounded-xl p-3 text-xs" style={{ background: bg }}>
                  <div className="font-semibold truncate">{t.topic}</div>
                  <div className="opacity-80 text-[10px] mt-0.5">{t.mastery}% · {t.total}q</div>
                </div>
              );
            })}
          </div>
        }
      </div>
    </div>
  );
}
