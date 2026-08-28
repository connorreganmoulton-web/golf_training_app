# ADR-0001 — Training dashboard, round entry, and the metric that leads

- **Status:** Accepted, 2026-08-28. Three CLAUDE.md amendments in "Consequences" are **pending owner sign-off** and are not yet made.
- **Supersedes:** nothing. First ADR in this repo.
- **Full design doc:** <https://claude.ai/code/artifact/7ebe525c-e46f-4456-b0b4-4fcc722eaeb1>

## Context

The app had no UI at all — `src/app/` contained only route handlers, and the README's
`docker compose up` instruction led to a 404 (see issue #39). Before building screens,
the owner asked what the front end was *for*.

Two facts settled it, and both were previously unrecorded:

**The owner's actual game.** A nine-hole Wednesday league at Morris Williams, par 36.
45 (+9) on 2026-08-26 — described as a good day — and 49 (+13) the week before, so an
average near 47, roughly a 22 handicap. Goal is a lower *average*, high 80s over
eighteen, long-term as close to scratch as possible. The 45 broke down as 3 pars,
3 bogeys, 3 doubles.

**His doubles are contact failures, not decisions.** All three, from his own account:
a par 3 pulled left then a mis-hit chip; a topped driver then a chunked recovery;
a good drive then a shanked pitching wedge. Five bad strikes, zero penalty strokes,
zero bad decisions.

That last point matters more than it looks. `docs/BENCHMARKS.md` says ~70% of doubles
begin with a penalty or a failed recovery — a *decision* problem — and the default plan
is weighted accordingly. His have the failed-recovery shape but fail on **contact**.
The stock plan would have prescribed course management, confidently and wrongly.

Published strokes-gained research agrees on the category if not the cause: for a
20-handicap measured against scratch, approach play is ~6.0 strokes, off-the-tee ~2–3
(almost entirely penalties and recovery, not distance), around-the-green ~2, and
putting only ~1.4. Driving distance is *identical* between a 15 and a 20 handicap.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Headline metric is doubles-or-worse per nine.** | It is the lever, it is computable from hole scores alone, and the arithmetic is exact: ~47 average → ~44 goal is three doubles becoming bogeys. The metric *is* the goal. |
| 2 | **Targets ladder from the user's current average**, not fixed benchmarks. | The engine's 3.5 GIR/9 target is a 10-handicap's number. Pointing a 22-handicap at it means failing weekly for a year while genuinely improving. |
| 3 | **Round entry becomes course-aware**: pick the course, nine steppers pre-filled at par, tap up from par. | The app should do the arithmetic. Making the user count their own doubles is the app asking for derived data it can compute. |
| 4 | **Every hole over par requires a one-tap cause tag** (tee / approach / chip / putting / penalty). | Hole scores yield only doubles and total; the engine also needs GIR, penalties and three-putts. Owner chose bogeys *and* doubles over the narrower doubles-only proposal — six taps per round, complete picture. This reproduces weekly, without a conversation, the diagnosis above. |
| 5 | **Course pars are entered once, manually.** | No free, reliable API for course data. The existing rule against hunting for a round-data API applies here for the same reasons. |
| 6 | **Practice is prescribed daily**, with the user choosing 15/30/60 length at the time. | Owner will practise daily given a plan. Self-selection steers toward driver work, which the data says matters least for him. |
| 7 | **Blocks are filtered to owned equipment.** | Owner has a net, hitting mat, Rapsodo MLM2PRO and putting mat; no chipping space or foam balls. `lowpoint` is cut (needs foam balls — he'll chip into the net instead), and `sim` is cut for now because it rehearses decisions and his failures aren't decisions. Prescribing an impossible drill is worse than prescribing nothing. |
| 8 | **Laptop-first.** | It is a review surface, not a capture surface. |
| 9 | **No round-data importer yet.** | Nine steppers at par is ~20s. Golfity's own hole-by-hole entry costs more, then adds export/transfer/import on top — a slower path to identical data. League rounds are hand-entered regardless (Spark has no export), so addressable volume is small. |
| 10 | **If an importer is built, it is Golfity, and it is built for strokes gained.** | Stack rank: Golfity (4 of 4 engine inputs, free, self-serve, per-shot lie + distance) > Golf Pad (2 of 4 free; doubles and three-putts behind $29.99/yr, which fails the free-forever rule) > Golf Sync (1 of 4, unmaintained 14 months). Golfity's shots file carries starting/ending distance and lie plus club — exactly `RoundShot`'s schema, and exactly what CLAUDE.md calls impossible for strokes gained. |
| 11 | **Nothing in the app may assume an AI is present.** | Screenshots-to-an-assistant is a favour to one user, not a feature. A self-hosting user running `docker compose up` offline with no account cannot do it. An AI dependency breaks free, self-hostable, offline and account-free simultaneously. |

## Consequences

**Build order.** Fix #40 first — the greens-hit deficit is capped at 1.0 while doubles
and penalties are unbounded, so approach practice can lose to categories hurting the
player less, and the owner is the exact profile it breaks on. Building a weakness
ranking on a scoring function known to be skewed would be the app doing what its own
honesty rules forbid. Then: round entry → dashboard → This Week (the plan engine's
eight blocks already exist and need only a screen) → importer, if at all.

**Schema work implied by decisions 3–5.** A course concept with per-hole pars, hole-level
scores, and a cause tag per over-par hole. `Round`'s current aggregate columns
(`gir`, `penalties`, `doubles`, `threePutts`) become derived rather than entered.

**CLAUDE.md amendments — proposed, NOT yet made, pending owner sign-off:**

1. Round entry is no longer "five steppers." It is nine steppers pre-filled at par plus
   a tag on every hole over par. The spirit holds — no keyboard, fast, thumbable — but
   the letter is wrong and the twenty-second claim needs restating against the new flow.
2. "No setup" gains an exception: a course's pars must be entered once before its first
   round. Still no account, still one command, but no longer literally zero setup.
3. New non-negotiable: the app never assumes an AI (decision 11).

**Before any Golfity adapter work**, three things are unverified at once: whether
penalties are captured at all, whether the "Pro" IAP gates export, and one App Store
review reporting an export that produced no file. One hand-entered nine-hole round with
a known penalty and a known three-putt, exported on the free tier, answers all three and
produces the real fixture the adapter needs. Synthetic fixtures are banned by
`CLAUDE.md`. If export fails or is gated, the fallback is mScorecard or FairwayFiles —
not Golf Pad premium.

## Note on how the diagnosis was reached

An early estimate put the owner at ~96 from published handicap tables; a later one put
him at ~90 from his single best round. Both were wrong, and the second was wrong in the
way this app exists to prevent — letting one nine-hole round move a headline number.
Neither the owner's scores nor his equipment were recorded anywhere in the repo, so both
estimates were guesses. That is why this ADR opens with the numbers.
