# AGENTS.md

- Achievement badges are computed client-side in `src/lib/achievements.ts` from profile + attempts — no database table. Why: avoids a migration and RLS surface; badges are pure functions of existing data.
- Adaptive AI calls (question generation, explanations, learning path) go through Lovable AI Gateway edge functions with a forced tool call for structured output. Why: keeps the API key server-side and gives typed results.
- `attempts` is deliberately excluded from the Realtime publication for privacy (cross-user broadcast risk). Dashboard refreshes via local state after inserts instead.
