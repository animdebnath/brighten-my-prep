import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Flame, Sparkles, Target, TrendingUp, Swords } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

type Profile = { display_name: string; xp: number; streak: number };
type Attempt = { is_correct: boolean; topic: string; subject: string; created_at: string };

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name,xp,streak").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setProfile(data as Profile));
    supabase.from("attempts").select("is_correct,topic,subject,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setAttempts((data as Attempt[]) ?? []));

    const ch = supabase.channel("dash-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (p) => setProfile(p.new as Profile))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const total = attempts.length;
  const correct = attempts.filter(a => a.is_correct).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;

  // Trend by last 10 attempts (running accuracy)
  const trend = attempts.slice(0, 20).reverse().map((a, i, arr) => {
    const slice = arr.slice(0, i + 1);
    const acc = Math.round((slice.filter(x => x.is_correct).length / slice.length) * 100);
    return { i: i + 1, acc };
  });

  // Weak topics
  const topicMap = new Map<string, { correct: number; total: number }>();
  attempts.forEach(a => {
    const t = topicMap.get(a.topic) ?? { correct: 0, total: 0 };
    t.total += 1; if (a.is_correct) t.correct += 1;
    topicMap.set(a.topic, t);
  });
  const weak = [...topicMap.entries()]
    .filter(([, v]) => v.total >= 2)
    .map(([k, v]) => ({ topic: k, mastery: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => a.mastery - b.mastery).slice(0, 5);

  const predicted = Math.min(99, Math.round(accuracy * 0.85 + (profile?.streak ?? 0) * 1.5));

  const stats = [
    { label: "XP", value: profile?.xp ?? 0, icon: Sparkles, color: "text-primary" },
    { label: "Streak", value: `${profile?.streak ?? 0}d`, icon: Flame, color: "text-accent" },
    { label: "Accuracy", value: `${accuracy}%`, icon: Target, color: "text-secondary" },
    { label: "Predicted", value: `${predicted}%`, icon: TrendingUp, color: "text-gradient" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Welcome back</div>
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Hi <span className="text-gradient">{profile?.display_name ?? "Learner"}</span>, ready to level up?
          </h1>
        </div>
        <Link to="/app/practice"><Button className="bg-gradient-primary text-primary-foreground glow-primary"><Swords className="h-4 w-4 mr-2" />Start practice</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wider">
              {s.label} <s.icon className="h-4 w-4" />
            </div>
            <div className={`mt-2 font-display text-2xl font-bold ${s.color}`}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-2 min-h-[260px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Accuracy trend</h3>
            <span className="text-xs text-muted-foreground">last {trend.length || 0} questions</span>
          </div>
          {trend.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Practice a few questions to see your trend.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(265 90% 66%)" />
                    <stop offset="100%" stopColor="hsl(320 90% 65%)" />
                  </linearGradient>
                </defs>
                <XAxis dataKey="i" stroke="hsl(220 15% 50%)" fontSize={11} />
                <YAxis domain={[0, 100]} stroke="hsl(220 15% 50%)" fontSize={11} />
                <Tooltip contentStyle={{ background: "hsl(232 30% 10%)", border: "1px solid hsl(232 25% 18%)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="acc" stroke="url(#g1)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Weak areas</h3>
          {weak.length === 0 ? (
            <div className="text-sm text-muted-foreground">No weak topics yet. Keep practicing!</div>
          ) : (
            <ul className="space-y-3">
              {weak.map(w => (
                <li key={w.topic}>
                  <div className="flex justify-between text-sm mb-1"><span className="truncate pr-2">{w.topic}</span><span className="text-muted-foreground">{w.mastery}%</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-gradient-primary" style={{ width: `${w.mastery}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
