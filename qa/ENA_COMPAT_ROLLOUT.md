# ENA: rollout plan (not deployed)

1. Deploy Edge Function `panapass-ena-finalize` in an authorized pipeline. Current production v15 is managed in Supabase, not deployed by GitHub main workflow.
2. Integrate `qa/ena-date-compatibility.mjs` (move into the function source tree on deployment) into the finalizer, and explicitly convert `sourceDate(row).value` with `parseEnaDate(value, panamaYMD(), Date.now())`. Do **not** default missing dates to today.
3. Reject unknown/ambiguous, stale or future timestamps; record only key names and parse diagnostics, not balances or credentials. Validate schema and row totals.
4. Where the finalizer's default pending-cut selector is currently `order("iniciado_en",{ascending:false}).limit(1)`, replace with `ascending:true` so pending AM is evaluated before PM. Explicit `tipo` requests remain unchanged.
5. Preserve 35-minute minimum wait, 95% expected counts, stabilization across at least 180 seconds, duplicate protection, DB read-back and audit history. Do not mark cuts LISTO from an HTTP 200 alone.
6. Test against the real ENA payload before rollout, verify >=95% previous valid count, zero unknown timestamps, two stable samples and AM->PM ordered processing. Keep previous function version available for rollback.
7. Run `node qa/ena-date-compatibility.test.mjs` on the branch and add this regression test to CI.
8. Verify both scheduled jobs remain active for tomorrow. No change to schedules or production database is included in this branch.

External source outages cannot be made impossible; the desired behavior is clear diagnostics and automatic safe recovery after the source is usable.
