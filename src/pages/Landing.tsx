import { Link } from "react-router-dom";
import { Brain, Sparkles, Zap, BarChart3, Trophy, MessagesSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const features = [
  { icon: Zap, title: "Adaptive Engine", desc: "AI generates fresh questions and adjusts difficulty in real time." },
  { icon: BarChart3, title: "Live Analytics", desc: "Mastery heatmaps, accuracy trends and predicted exam score." },
  { icon: MessagesSquare, title: "AI Study Coach", desc: "Streaming explanations and a chat assistant whenever you need." },
  { icon: Trophy, title: "Real-Time Leaderboard", desc: "XP, streaks and badges sync instantly across devices." },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen">
      <header className="px-6 py-5 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg">SmartPrep <span className="text-gradient">AI</span></span>
        </div>
        <Link to={user ? "/app" : "/auth"}>
          <Button variant="secondary" size="sm">{user ? "Open app" : "Sign in"}</Button>
        </Link>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium mb-6">
          <Sparkles className="h-3.5 w-3.5 text-secondary" /> Real-time adaptive learning, powered by AI
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
          className="font-display text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
          Master any exam with <br />
          <span className="text-gradient">your personal AI tutor</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          SmartPrep AI generates adaptive questions, tracks your weak areas live, and coaches you back to mastery — all in a beautiful real-time workspace.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to={user ? "/app" : "/auth"}>
            <Button size="lg" className="bg-gradient-primary text-primary-foreground glow-primary hover:opacity-90 h-12 px-7 text-base">
              Start practicing free <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/app/assistant">
            <Button size="lg" variant="ghost" className="h-12 px-6 text-base">Meet the AI coach</Button>
          </Link>
        </motion.div>

        {/* Floating preview */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7 }}
          className="mt-20 grid md:grid-cols-3 gap-4 text-left">
          {[
            { k: "Accuracy", v: "87%", c: "text-secondary" },
            { k: "Streak", v: "12 days", c: "text-accent" },
            { k: "Predicted score", v: "A+", c: "text-gradient" },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.k}</div>
              <div className={`text-3xl font-display font-bold mt-1 ${s.c}`}>{s.v}</div>
            </div>
          ))}
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-6 hover:border-primary/40 transition-all">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary/20 flex items-center justify-center mb-3">
              <f.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="font-semibold mb-1">{f.title}</div>
            <div className="text-sm text-muted-foreground">{f.desc}</div>
          </motion.div>
        ))}
      </section>

      <footer className="border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} SmartPrep AI · Built with Lovable
      </footer>
    </div>
  );
}
