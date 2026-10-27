import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, Sparkles, CheckCircle2, XCircle, ArrowRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

type Q = { question: string; options: string[]; correct_answer: string; topic: string; concept_hint: string };
type Difficulty = "easy" | "medium" | "hard";

const SUBJECTS = ["Mathematics", "Physics", "Computer Science", "Biology", "History", "English"];

export default function Practice() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("Computer Science");
  const [topic, setTopic] = useState("Data Structures");
  const [confidence, setConfidence] = useState([3]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [q, setQ] = useState<Q | null>(null);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const recentTopics = useRef<string[]>([]);
  const startedAt = useRef<number>(0);

  const [note, setNote] = useState<string | null>(null);
  const fetchQuestion = async (override?: { subject?: string; topic?: string }) => {
    const s = override?.subject ?? subject;
    const t = override?.topic ?? topic;
    setLoading(true); setPicked(null); setExplanation(null); setQ(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-question", {
        body: { subject: s, topic: t, difficulty, recentTopics: recentTopics.current.slice(-5) },
      });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      setQ(data as Q);
      recentTopics.current.push((data as Q).topic);
      startedAt.current = Date.now();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load question");
    } finally { setLoading(false); }
  };

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const s = searchParams.get("subject");
    const t = searchParams.get("topic");
    if (s || t) {
      if (s) setSubject(s);
      if (t) setTopic(t);
      fetchQuestion({ subject: s ?? undefined, topic: t ?? undefined });
    } else {
      fetchQuestion();
    }
    /* eslint-disable-next-line */
  }, []);

  const submit = async (option: string) => {
    if (!q || picked || !user) return;
    setPicked(option);
    const elapsed = Date.now() - startedAt.current;
    const isCorrect = option === q.correct_answer;

    // Adaptive difficulty
    if (isCorrect && elapsed < 12000 && confidence[0] >= 3) {
      setDifficulty(d => d === "easy" ? "medium" : d === "medium" ? "hard" : "hard");
    } else if (!isCorrect || confidence[0] <= 2) {
      setDifficulty(d => d === "hard" ? "medium" : d === "medium" ? "easy" : "easy");
    }

    const xpDelta = isCorrect ? (difficulty === "hard" ? 30 : difficulty === "medium" ? 20 : 10) : 2;
    const newStreak = isCorrect ? streakCount + 1 : 0;
    setStreakCount(newStreak);

    // Insert attempt
    await supabase.from("attempts").insert({
      user_id: user.id, subject, topic: q.topic, difficulty,
      question: q.question, options: q.options, correct_answer: q.correct_answer,
      user_answer: option, is_correct: isCorrect, response_ms: elapsed, confidence: confidence[0],
    });

    // Update profile XP / streak
    const { data: prof } = await supabase.from("profiles").select("xp,streak,last_active").eq("id", user.id).maybeSingle();
    const today = new Date().toISOString().slice(0, 10);
    const lastActive = (prof as any)?.last_active as string | null;
    let dailyStreak = (prof as any)?.streak ?? 0;
    if (lastActive !== today) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      dailyStreak = lastActive === y.toISOString().slice(0, 10) ? dailyStreak + 1 : 1;
    }
    await supabase.from("profiles").update({
      xp: ((prof as any)?.xp ?? 0) + xpDelta,
      streak: dailyStreak,
      last_active: today,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    // Fetch explanation
    setExplaining(true);
    try {
      const { data, error } = await supabase.functions.invoke("explain-answer", {
        body: { question: q.question, options: q.options, correct_answer: q.correct_answer, user_answer: option, is_correct: isCorrect },
      });
      if (error) throw error;
      setExplanation((data as any).explanation ?? "");
    } catch { setExplanation("Couldn't load explanation."); }
    finally { setExplaining(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Practice Arena</div>
          <h1 className="font-display text-3xl font-bold">Adaptive <span className="text-gradient">questions</span></h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 rounded-full glass text-xs">Difficulty: <b className="capitalize text-secondary">{difficulty}</b></span>
          <span className="px-3 py-1 rounded-full glass text-xs flex items-center gap-1"><Zap className="h-3 w-3 text-accent" /> Streak: {streakCount}</span>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 grid sm:grid-cols-3 gap-3">
        <div>
          <Label className="text-xs">Subject</Label>
          <select
            value={subject}
            onChange={e => {
              const next = e.target.value;
              setSubject(next);
              recentTopics.current = [];
              // defer to next tick so state is applied
              setTimeout(() => fetchQuestion(), 0);
            }}
            className="w-full mt-1 h-10 rounded-xl bg-input border border-border px-3 text-sm">
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Topic <span className="text-muted-foreground">(press Enter)</span></Label>
          <Input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && topic.trim()) {
                e.preventDefault();
                recentTopics.current = [];
                fetchQuestion();
              }
            }}
            className="mt-1"
            placeholder="e.g. Sorting algorithms"
          />
        </div>
        <div>
          <Label className="text-xs">Confidence: {confidence[0]}/5</Label>
          <Slider value={confidence} onValueChange={setConfidence} min={1} max={5} step={1} className="mt-3" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading || !q ? (
          <motion.div key="loading" className="glass rounded-2xl p-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>Generating an adaptive question…</div>
          </motion.div>
        ) : (
          <motion.div key={q.question} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-strong rounded-3xl p-6 md:p-8 space-y-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-secondary" /> {q.topic}
            </div>
            <div className="font-display text-xl md:text-2xl font-semibold leading-snug">{q.question}</div>
            <div className="grid sm:grid-cols-2 gap-3">
              {q.options.map((opt, i) => {
                const isCorrect = picked && opt === q.correct_answer;
                const isWrongPick = picked === opt && opt !== q.correct_answer;
                return (
                  <button key={i} disabled={!!picked} onClick={() => submit(opt)}
                    className={`text-left rounded-2xl p-4 border transition-all ${
                      isCorrect ? "border-success bg-success/10 glow-cyan" :
                      isWrongPick ? "border-destructive bg-destructive/10" :
                      picked ? "border-border opacity-50" :
                      "border-border hover:border-primary hover:bg-primary/5"
                    }`}>
                    <div className="flex items-start gap-3">
                      <span className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm">{opt}</span>
                      {isCorrect && <CheckCircle2 className="ml-auto h-5 w-5 text-success" />}
                      {isWrongPick && <XCircle className="ml-auto h-5 w-5 text-destructive" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {picked && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div className="glass rounded-2xl p-5 prose prose-invert prose-sm max-w-none">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-secondary" /> AI explanation
                  </div>
                  {explaining ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div> :
                    <ReactMarkdown>{explanation ?? ""}</ReactMarkdown>}
                </div>
                <Button onClick={fetchQuestion} className="w-full bg-gradient-primary text-primary-foreground glow-primary h-12">
                  Next question <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
