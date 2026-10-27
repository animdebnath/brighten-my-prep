# Roadmap — SmartPrep AI

## Phase 1 (done)
- Auth (email/password) + auto profile creation
- Practice Arena: AI question generation, adaptive difficulty, confidence, XP/streak
- Dashboard: XP, streak, accuracy trend, weak areas, predicted score (realtime)
- Analytics: subject mastery, topic heatmap, pass probability
- Leaderboard (realtime), AI Assistant chat
- Security fixes: attempts removed from realtime publication

## Phase 2 (current)
- [x] Learning Path page (AI 7-day study plan from weak topics) + `learning-path` edge function
- [x] Weak-area custom quizzes: "Fix weakest area" jumps into Practice preloaded with subject + topic
- [x] Practice accepts `?subject=&topic=` URL params and auto-fetches
- [x] Achievement badges (10 badges computed from profile + attempts) on Dashboard
- [x] Explainable AI: concept hint + "why this level" note in Practice

## Phase 3 (ideas)
- Badge unlock toasts during practice
- Persisted study plans + progress check-off
- Exam mode: timed multi-question test from `sessions`
- Bangla/English language toggle
