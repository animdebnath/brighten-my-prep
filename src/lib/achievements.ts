export type Badge = {
  id: string;
  label: string;
  description: string;
  icon: string;
  unlocked: boolean;
};

// Badges are computed client-side from profile + attempts (no extra table needed).
export function computeBadges(
  profile: { xp: number; streak: number } | null,
  attempts: { is_correct: boolean; subject: string }[],
): Badge[] {
  const total = attempts.length;
  const subjects = new Set(attempts.map(a => a.subject));

  // Best run of consecutive correct answers (attempts arrive newest-first)
  let bestRun = 0;
  let run = 0;
  [...attempts].reverse().forEach(a => {
    run = a.is_correct ? run + 1 : 0;
    bestRun = Math.max(bestRun, run);
  });

  const xp = profile?.xp ?? 0;
  const streak = profile?.streak ?? 0;

  return [
    { id: "first-steps", label: "First Steps", description: "Answer your first question", icon: "🌱", unlocked: total >= 1 },
    { id: "ten-club", label: "Ten Club", description: "Answer 10 questions", icon: "🎯", unlocked: total >= 10 },
    { id: "half-century", label: "Half Century", description: "Answer 50 questions", icon: "💪", unlocked: total >= 50 },
    { id: "centurion", label: "Centurion", description: "Answer 100 questions", icon: "🏆", unlocked: total >= 100 },
    { id: "sharp-shooter", label: "Sharp Shooter", description: "5 correct in a row", icon: "🎖️", unlocked: bestRun >= 5 },
    { id: "hot-streak", label: "Hot Streak", description: "3-day study streak", icon: "🔥", unlocked: streak >= 3 },
    { id: "week-warrior", label: "Week Warrior", description: "7-day study streak", icon: "🚀", unlocked: streak >= 7 },
    { id: "xp-500", label: "XP 500", description: "Earn 500 XP", icon: "⚡", unlocked: xp >= 500 },
    { id: "explorer", label: "Explorer", description: "Practice 4 subjects", icon: "🧭", unlocked: subjects.size >= 4 },
    { id: "perfectionist", label: "Perfectionist", description: "Hit 90% accuracy (10+ questions)", icon: "💎", unlocked: total >= 10 && Math.round((attempts.filter(a => a.is_correct).length / total) * 100) >= 90 },
  ];
}
