import { Navigate, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Brain, LayoutDashboard, Swords, BarChart3, MessagesSquare, Trophy, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/app", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/app/practice", icon: Swords, label: "Practice" },
  { to: "/app/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/app/leaderboard", icon: Trophy, label: "Leaderboard" },
  { to: "/app/assistant", icon: MessagesSquare, label: "AI Assistant" },
];

export default function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  if (loading) return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-64 flex-col gap-2 p-4 border-r border-border/50 glass">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
            <Brain className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="font-display font-bold text-lg">SmartPrep <span className="text-gradient">AI</span></div>
        </div>
        <nav className="flex flex-col gap-1 mt-2">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "bg-gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`
              }>
              <n.icon className="h-4 w-4" /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass-strong px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center"><Brain className="h-4 w-4 text-primary-foreground" /></div>
          <span className="font-display font-bold">SmartPrep <span className="text-gradient">AI</span></span>
        </div>
        <Button size="sm" variant="ghost" onClick={async () => { await signOut(); navigate("/"); }}><LogOut className="h-4 w-4" /></Button>
      </div>
      <main className="flex-1 md:ml-0 mt-14 md:mt-0 p-4 md:p-8 max-w-full overflow-x-hidden">
        <Outlet />
        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-3 left-3 right-3 glass-strong rounded-2xl flex justify-around p-2 z-40">
          {nav.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] ${isActive ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="h-4 w-4" />{n.label}
            </NavLink>
          ))}
        </div>
        <div className="md:hidden h-20" />
      </main>
    </div>
  );
}
