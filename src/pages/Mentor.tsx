import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Compass, ArrowRight, RefreshCw, Route } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Attempt = { is_correct: boolean; topic: string; subject: string };
type Plan = {
  summary: string;
  focus_areas: { subject: string; topic: string; reason: string }[];
  daily_plan: { day: number; focus: string; tasks: string[] }[];
  motivation: string;
};

export default function Mentor() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [streak, setStreak] = useState(0);
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const autoRan = useRef(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("attempts").select("is_correct,topic,subject").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("streak").eq("id", user.id).maybeSingle(),
    ]).then(([a, p]) => {
      setAttempts((a.data as Attempt[]) ?? []);
      setStreak((p.data as any)?.streak ?? 0);
      setLoadingData(false);
    });
  }, [user]);

  const total = attempts.length;
  const accuracy = total ? Math.round((attempts.filter(a => a.is_correct).length / total) * 100) : 0;

  const subjMap = new Map<string, { c: number; t: number }>();
  const topicMap = new Map<string, { c: number; t: number; subject: string }>();
  attempts.forEach(a => {
    const s = subjMap.get(a.subject) ?? { c: 0, t: 0 };
    s.t++; if (a.is_correct) s.c++; subjMap.set(a.subject, s);
    const t = topicMap.get(a.topic) ?? { c: 0, t: 0, subject: a.subject };
    t.t++; if (a.is_correct) t.c++; topicMap.set(a.topic, t);
  });
  const subjectStats = [...subjMap.entries()].map(([subject, v]) => ({ subject, mastery: Math.round((v.c / v.t) * 100), total: v.t }));
  const weakTopics = [...topicMap.entries()]
    .filter(([, v]) => v.t >= 2 && v.c / v.t < 0.7)
    .sort((a, b) => a[1].c / a[1].t - b[1].c / b[1].t)
    .slice(0, 6)
    .map(([topic, v]) => `${topic} (${v.subject}, ${Math.round((v.c / v.t) * 100)}%)`);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("learning-path", {
        body: { accuracy, streak, total, subjectStats, weakTopics },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      setPlan(data as Plan);
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't generate your plan");
    } finally { setGenerating(false); }
  };

  useEffect(() => {
    if (loadingData || autoRan.current) return;
    autoRan.current = true;
    if (total >= 5) generate();
    /* eslint-disable-next-line */
  }, [loadingData]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Personalized Learning Intelligence</div>
          <h1 className="font-display text-3xl font-bold">Your learning <span className="text-gradient">path</span></h1>
        </div>
        <Button variant="outline" onClick={generate} disabled={generating || loadingData}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {plan ? "Regenerate plan" : "Generate plan"}
        </Button>
      </div>

      {loadingData ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>Analyzing your performance…</div>
        </div>
      ) : total < 5 ? (
        <div className="glass rounded-2xl p-12 text-center space-y-4">
          <Compass className="h-10 w-10 mx-auto text-primary" />
          <div className="font-display text-lg font-semibold">Not enough data yet</div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Answer at least 5 questions and your AI coach will build a personalized 7-day study plan from your weak areas.
          </p>
          <Link to="/app/practice"><Button className="bg-gradient-primary text-primary-foreground glow-primary">Start practicing</Button></Link>
        </div>
      ) : generating ? (
        <div className="glass rounded-2xl p-12 flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>Your AI coach is designing your study plan…</div>
        </div>
      ) : plan ? (
        <>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-secondary" /> Coach diagnosis
            </div>
            <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{plan.summary}</ReactMarkdown></div>
            <div className="text-sm text-accent flex items-center gap-2"><Route className="h-4 w-4" />{plan.motivation}</div>
          </motion.div>

          <div>
            <h3 className="font-semibold mb-3">Focus areas first</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {plan.focus_areas.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">{f.topic}</span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.subject}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{f.reason}</p>
                  <Link to={`/app/practice?subject=${encodeURIComponent(f.subject)}&topic=${encodeURIComponent(f.topic)}`}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Practice this now <ArrowRight className="h-3 w-3" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">7-day plan</h3>
            <div className="space-y-2">
              {plan.daily_plan.sort((a, b) => a.day - b.day).map((d, i) => (
                <motion.div key={d.day} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="glass rounded-2xl p-4 flex gap-4 items-start">
                  <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center font-display font-bold text-sm text-primary-foreground flex-shrink-0">
                    {d.day}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{d.focus}</div>
                    <ul className="mt-1 space-y-0.5">
                      {d.tasks.map((t, j) => <li key={j} className="text-xs text-muted-foreground flex gap-1.5"><span className="text-primary">›</span>{t}</li>)}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Hit “Generate plan” and your AI coach will build a 7-day study plan from your performance data.
        </div>
      )}
    </div>
  );
}
