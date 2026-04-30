import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Flame, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

type Row = { id: string; display_name: string; xp: number; streak: number };

export default function Leaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  const load = () => {
    supabase.from("profiles").select("id,display_name,xp,streak").order("xp", { ascending: false }).limit(50)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("leaderboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      <div>
        <div className="text-sm text-muted-foreground">Real-time Leaderboard</div>
        <h1 className="font-display text-3xl font-bold">Top <span className="text-gradient">learners</span></h1>
      </div>

      <div className="glass-strong rounded-3xl p-3">
        {rows.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">No learners yet — be the first!</div>}
        <ul className="divide-y divide-border/40">
          {rows.map((r, i) => {
            const isMe = r.id === user?.id;
            return (
              <motion.li key={r.id} layout
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl ${isMe ? "bg-primary/10" : ""}`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  i === 0 ? "bg-gradient-primary text-primary-foreground glow-primary" :
                  i === 1 ? "bg-gradient-secondary text-secondary-foreground" :
                  i === 2 ? "bg-accent/30 text-accent" : "bg-muted text-muted-foreground"
                }`}>
                  {i < 3 ? <Crown className="h-4 w-4" /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    {r.display_name} {isMe && <span className="text-[10px] uppercase tracking-wider text-primary">You</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-3">
                    <span className="flex items-center gap-1"><Flame className="h-3 w-3 text-accent" />{r.streak}d</span>
                  </div>
                </div>
                <div className="font-display font-bold text-gradient flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-primary" /> {r.xp}
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
