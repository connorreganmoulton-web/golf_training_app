# golf_training_app — working notes for Claude Code

This file is the handoff. It carries the decisions and the reasoning behind
them so you don't re-litigate settled questions or quietly undo them.

## What this is

A free, self-hostable golf improvement tracker. The repo is named
`golf_training_app`; the owner's separate `myturngolf` folder holds content
(video, posts) and is unrelated to this codebase. Don't reach into it.

It imports launch monitor data,
takes fast manual round entry, and produces a weekly practice plan built from
the user's own numbers.

It will never charge money. That is a fixed constraint from the owner, not a
launch-phase decision. It rules out anything that requires per-user paid API
licensing, and it means hosting costs have to stay near zero for a small user
base.

## Non-negotiables

1. **Free forever.** No paywalls, no premium tier, no "pro" features.
2. **Runs locally with one command and no account.** `docker compose up`.
   A person with a launch monitor and no technical background is the target user.
3. **Never fabricate confidence.** If there isn't enough data to justify a
   claim, the UI says so plainly. See "Honesty rules" below.
4. **The user's data is theirs.** Export must always work. No lock-in.

## Stack and why

- **Next.js (App Router), TypeScript** — one process serves UI and API, so
  local deployment is a single container. Hosting later is the same artifact.
- **SQLite + Prisma by default** — zero setup for the local case. The schema is
  deliberately Postgres-compatible; switching is a `provider` change in
  `prisma/schema.prisma` plus fresh migrations, and no application code changes.
  Use `docker-compose.hosted.yml` for that path.
- **Auth.js, disabled by default** — `SINGLE_USER=true` skips login entirely.
  The auth tables exist in the schema from day one so enabling multi-user is
  configuration, not a migration.
- **No state management library.** Server components plus route handlers.
  Don't add Redux or Zustand without a concrete reason.

## Architecture

```
src/lib/import/     Adapters. One file per launch monitor. Pure functions.
src/lib/analytics/  Shot and round math. No I/O.
src/lib/plan/       Weekly plan generation.
src/app/            Routes and UI.
prisma/             Schema and migrations.
tests/fixtures/     Real export files. Never replace with synthetic data.
```

### Adding a launch monitor

Write one file implementing `ImportAdapter` from `src/lib/import/types.ts`,
register it in `src/lib/import/index.ts`, and add a real export to
`tests/fixtures/`. Nothing else changes.

Adapters must stay pure — text in, `ParsedSession` out. No database, no network,
no filesystem. That is what makes them testable against real files.

Priority order for new adapters: TrackMan (TPS CSV), FlightScope Mevo/Mevo+,
SkyTrak, Garmin R10, GSPro, Awesome Golf.

Club names get normalized at the adapter boundary via `normalizeClub`. Devices
spell the same club four different ways; analytics code should only ever see
one spelling.

## Round data: the integration question, already researched

**There is no legitimate free API for round data. Do not go looking for one.**

- **Arccos** has a real API, but it's a fee-bearing commercial license under
  which Arccos retains ownership of all user data. Incompatible with a free
  product.
- **Shot Scope** has no export at all. A third-party exporter exists that works
  by taking the user's Shot Scope password and logging in as them.
- **18Birdies** has no export.
- Unofficial reverse-engineered clients exist for several of these. They all
  require harvesting user credentials. **Do not ship credential harvesting.**
  It is fine for a person to do to their own account; it is not something to
  put in software other people install.

The consequence: **round data is manual entry, and manual entry must be fast.**
Five stepper controls, no keyboard, under twenty seconds. If round logging ever
takes longer than that, the product has failed at its main job — people stop
tracking when logging feels like work.

GHIN posting is a plausible future addition (write, not read). Verify access
terms before building it.

## Honesty rules

These are product requirements, not style preferences. The plan engine and UI
must not overstate what the data supports.

- Below `MIN_ROUNDS` (6), serve the default plan and **say it's the default**.
  Never present a population-average plan as personalized.
- Nine-hole samples are small. Never let a single round move a headline number
  without a caveat attached.
- Spread and standard deviation are different things and get labelled
  differently. Spread is one shank away from being meaningless.
- `suggestExclusions` suggests. It never auto-deletes. Deciding a shot didn't
  count is the user's call.
- When a metric improves, do not claim to know why. The app can see that greens
  hit went up; it cannot see whether the pins were easier.

## Data model notes

- `Shot` is per-ball, not per-session. Session averages hide the interesting
  parts — two players averaging 161 with a 7 iron can have completely different
  games. Keep it shot-level.
- Excluded shots are flagged, not deleted, so the raw import stays intact.
- `ImportBatch.checksum` makes re-importing the same file a no-op. Duplicate
  sessions from a double-click corrupt every trend downstream.
- `PracticeSession.blockId` is derived from the date (the plan says what a given
  weekday is for) and is **always** user-overridable. Never infer the block from
  which clubs appear in the file — a person hitting 7 irons on a putting day is
  not doing iron work.

## Practice plan background

The default weekly plan and its benchmarks came from strokes gained research
summarized in `docs/BENCHMARKS.md`. The short version:

- Approach play is the largest category of lost strokes at every handicap.
- Roughly 70% of double bogeys start with a penalty or a failed recovery, which
  makes them a decision problem before a swing problem.
- Beyond 40 feet, putting make rates are effectively identical at every
  handicap. The separation is three-putt avoidance and the 3-to-6 foot zone.
- Random/variable practice beats blocked practice for retention and transfer,
  **but the evidence is more contested than popular coaching suggests.** A
  meta-analysis found limited support for a lasting advantage in sport. Don't
  present it as settled in UI copy.

## Testing

`npm test`. Fixtures are real export files, not synthetic. When adding an
adapter, get a genuine export from that device — hand-written CSVs miss the
quirks that break parsers, like Rapsodo repeating its header for every club
block and appending Average / Std. Dev. rows that look like shots.

## Things deliberately not built

- **Strokes gained.** Requires shot-level round data with lie and distance,
  which nobody can supply without hardware. The `RoundShot` table exists for
  the day that changes. Don't fake it from summary stats.
- **Green reading, course GPS.** Needs licensed course mapping data. Out of
  scope for a free product.
- **Social features.** No.

## Agent skills

### Issue tracker

Issues live in GitHub Issues on `connorreganmoulton-web/golf_training_app`, via
the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the root and ADRs under `docs/adr/`,
both created lazily rather than upfront. See `docs/agents/domain.md`.
