import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-chat`;

export default function Assistant() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("chat_messages").select("role,content").eq("user_id", user.id).order("created_at").limit(100)
      .then(({ data }) => data && setMessages(data as Msg[]));
  }, [user]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim(); if (!text || loading || !user) return;
    setInput(""); setLoading(true);
    const userMsg: Msg = { role: "user", content: text };
    setMessages(p => [...p, userMsg]);
    await supabase.from("chat_messages").insert({ user_id: user.id, role: "user", content: text });

    let assistant = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!resp.ok) {
        if (resp.status === 429) toast.error("Rate limit, please wait a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add credits in Workspace > Usage.");
        else toast.error("Chat failed");
        setLoading(false); return;
      }
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = ""; let done = false;
      setMessages(p => [...p, { role: "assistant", content: "" }]);
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx); buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) {
              assistant += c;
              setMessages(p => p.map((m, i) => i === p.length - 1 ? { ...m, content: assistant } : m));
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
      if (assistant) await supabase.from("chat_messages").insert({ user_id: user.id, role: "assistant", content: assistant });
    } catch (e: any) { toast.error(e.message ?? "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex flex-col animate-fade-up">
      <div className="mb-3">
        <div className="text-sm text-muted-foreground flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-secondary" /> AI Study Assistant</div>
        <h1 className="font-display text-3xl font-bold">Ask me <span className="text-gradient">anything</span></h1>
      </div>

      <div ref={scrollRef} className="flex-1 glass-strong rounded-3xl p-4 md:p-6 overflow-y-auto space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-12 text-sm">
            Try: <em>"Explain Big-O notation with examples"</em> or <em>"Quiz me on photosynthesis"</em>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "glass"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              ) : <div className="text-sm">{m.content}</div>}
            </div>
          </motion.div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about your studies…"
          onKeyDown={e => { if (e.key === "Enter") send(); }} className="h-12 rounded-2xl" />
        <Button onClick={send} disabled={loading} className="h-12 px-5 rounded-2xl bg-gradient-primary text-primary-foreground glow-primary">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
